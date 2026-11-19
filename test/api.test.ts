import type { Express } from 'express';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

let mongo: MongoMemoryServer;
let app: Express;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'bullet-in-test' });
  // Import after connecting: the session store reuses mongoose's connection.
  const { createApp } = await import('../src/app.js');
  app = createApp();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

beforeEach(async () => {
  // Empty every collection but keep indexes (like the unique email index).
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
});

const OWNER = { email: 'Owner@Example.com', password: 'correct horse battery' };

async function registeredAgent() {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send(OWNER).expect(201);
  return agent;
}

describe('auth', () => {
  it('registers the first user, keeps them signed in, and signs out', async () => {
    const agent = request.agent(app);

    await agent.get('/api/auth/status').expect(200, { registrationOpen: true, needsSetup: true });

    const registered = await agent.post('/api/auth/register').send(OWNER).expect(201);
    expect(registered.body.user).toMatchObject({
      email: 'owner@example.com',
      settings: { aiModel: 'claude-haiku-5-5' },
    });
    expect(registered.body.user.passwordHash).toBeUndefined();
    // The login session is stored in the app's own database.
    expect(await mongoose.connection.db!.collection('sessions').countDocuments()).toBe(1);

    const me = await agent.get('/api/auth/me').expect(200);
    expect(me.body.user.email).toBe('owner@example.com');

    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/auth/me').expect(401);
  });

  it('closes registration after the first account', async () => {
    await registeredAgent();
    await request(app).get('/api/auth/status').expect(200, { registrationOpen: false, needsSetup: false });
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'second@example.com', password: 'another password' })
      .expect(403);
  });

  it('rejects wrong passwords and unknown emails with the same message', async () => {
    await registeredAgent();

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: OWNER.email, password: 'not the password' })
      .expect(401);
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever123' })
      .expect(401);
    expect(wrongPassword.body.error).toBe(unknownEmail.body.error);

    const agent = request.agent(app);
    await agent.post('/api/auth/login').send(OWNER).expect(200);
    await agent.get('/api/auth/me').expect(200);
  });

  it('validates registration input', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400);
    expect(response.body.details.map((d: { field: string }) => d.field)).toEqual(['email', 'password']);
  });
});

describe('cards', () => {
  it('requires a signed-in user', async () => {
    await request(app).get('/api/cards').expect(401);
    await request(app).post('/api/cards').send({ title: 'x' }).expect(401);
  });

  it('creates cards at the bottom of their column and edits them', async () => {
    const agent = await registeredAgent();

    const first = await agent.post('/api/cards').send({ title: 'First' }).expect(201);
    const second = await agent
      .post('/api/cards')
      .send({ title: 'Second', dueDate: '2026-12-01', labels: ['work'] })
      .expect(201);

    expect(first.body.card).toMatchObject({ column: 'todo', position: 0, source: 'manual', dueDate: null });
    expect(second.body.card).toMatchObject({ position: 1, dueDate: '2026-12-01', labels: ['work'] });

    const edited = await agent
      .patch(`/api/cards/${first.body.card.id}`)
      .send({ title: 'First, renamed', description: 'Notes', dueDate: '2026-11-30' })
      .expect(200);
    expect(edited.body.card).toMatchObject({ title: 'First, renamed', description: 'Notes', dueDate: '2026-11-30' });

    const cleared = await agent.patch(`/api/cards/${first.body.card.id}`).send({ dueDate: null }).expect(200);
    expect(cleared.body.card.dueDate).toBeNull();

    await agent.patch(`/api/cards/${first.body.card.id}`).send({ dueDate: '2026-02-30' }).expect(400);
    await agent.patch(`/api/cards/${first.body.card.id}`).send({ title: '   ' }).expect(400);
    await agent.patch(`/api/cards/${first.body.card.id}`).send({ column: 'done' }).expect(400);
  });

  it('moves cards between and within columns and tracks completion', async () => {
    const agent = await registeredAgent();
    const ids: string[] = [];
    for (const title of ['A', 'B', 'C']) {
      const response = await agent.post('/api/cards').send({ title }).expect(201);
      ids.push(response.body.card.id);
    }
    const [a, b, c] = ids;

    // Reorder within To do: C to the top.
    let response = await agent.post(`/api/cards/${c}/move`).send({ column: 'todo', index: 0 }).expect(200);
    expect(titlesIn(response.body.cards, 'todo')).toEqual(['C', 'A', 'B']);

    // A to Done.
    response = await agent.post(`/api/cards/${a}/move`).send({ column: 'done', index: 0 }).expect(200);
    expect(titlesIn(response.body.cards, 'todo')).toEqual(['C', 'B']);
    const doneA = response.body.cards.find((card: { id: string }) => card.id === a);
    expect(doneA.completedAt).not.toBeNull();

    // An index past the end lands at the bottom.
    response = await agent.post(`/api/cards/${b}/move`).send({ column: 'done', index: 99 }).expect(200);
    expect(titlesIn(response.body.cards, 'done')).toEqual(['A', 'B']);

    // Leaving Done clears completedAt.
    response = await agent.post(`/api/cards/${a}/move`).send({ column: 'in_progress', index: 0 }).expect(200);
    const movedA = response.body.cards.find((card: { id: string }) => card.id === a);
    expect(movedA).toMatchObject({ column: 'in_progress', completedAt: null });

    await agent.post(`/api/cards/${a}/move`).send({ column: 'nowhere', index: 0 }).expect(400);
  });

  it('deletes cards', async () => {
    const agent = await registeredAgent();
    const created = await agent.post('/api/cards').send({ title: 'Temporary' }).expect(201);

    await agent.delete(`/api/cards/${created.body.card.id}`).expect(204);
    await agent.delete(`/api/cards/${created.body.card.id}`).expect(404);
    await agent.patch('/api/cards/not-an-id').send({ title: 'x' }).expect(404);
  });

  it("keeps each user's cards private", async () => {
    const owner = await registeredAgent();
    const created = await owner.post('/api/cards').send({ title: 'Private' }).expect(201);
    const cardId = created.body.card.id;

    // Registration is closed, so create the second user directly.
    const { User } = await import('../src/models/user.js');
    const { hashPassword } = await import('../src/auth/password.js');
    await User.create({ email: 'other@example.com', passwordHash: await hashPassword('other password') });
    const other = request.agent(app);
    await other.post('/api/auth/login').send({ email: 'other@example.com', password: 'other password' }).expect(200);

    const list = await other.get('/api/cards').expect(200);
    expect(list.body.cards).toEqual([]);
    await other.patch(`/api/cards/${cardId}`).send({ title: 'Hijacked' }).expect(404);
    await other.post(`/api/cards/${cardId}/move`).send({ column: 'done', index: 0 }).expect(404);
    await other.delete(`/api/cards/${cardId}`).expect(404);

    const ownerList = await owner.get('/api/cards').expect(200);
    expect(ownerList.body.cards).toHaveLength(1);
    expect(ownerList.body.cards[0].title).toBe('Private');
  });
});

describe('settings', () => {
  it('changes the AI model and rejects unknown models', async () => {
    const agent = await registeredAgent();

    const updated = await agent.patch('/api/settings').send({ aiModel: 'claude-sonnet-5-5' }).expect(200);
    expect(updated.body.user.settings.aiModel).toBe('claude-sonnet-5-5');

    await agent.patch('/api/settings').send({ aiModel: 'gpt-5' }).expect(400);
  });
});

function titlesIn(cards: Array<{ title: string; column: string; position: number }>, column: string) {
  return cards
    .filter((card) => card.column === column)
    .sort((x, y) => x.position - y.position)
    .map((card) => card.title);
}
