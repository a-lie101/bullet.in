// src/app/page.tsx

"use client"; // this tells next js that this is a client component so it can be interactive with the users browser
import KanbanColumn from "@/components/KanbanColumn";
import './globals.css';

// importing important react hooks. usestate lets the component have its own memory
// useEffect lets you perform side effects. saves data to the browsers local storage.

import { useState, useEffect } from "react"; 

// simple JavaScript array of objects - starting point for the kanban board while we test stuff.
const initialBoardData = [
  {
    title: 'TO DO',
    tickets: [
      { id: 'MBA-6', title: 'Task 1', category: 'Revenue' },
    ],
  },
  {
    title: 'IN PROGRESS',
    tickets: [
      { id: 'MBA-5', title: 'Task 2', category: 'Revenue' },
      { id: 'MBA-4', title: 'Task 3', category: 'Authentications' },
    ],
  },
  {
    title: 'IN REVIEW',
    tickets: [
      { id: 'MBA-3', title: 'Task 4', category: 'Authentications' },
    ],
  },
  {
    title: 'DONE',
    tickets: [],
  },
];

// the main page component
// src/app/dashboard/page.tsx

export default function DashboardPage() {
  const [boardData, setBoardData] = useState(initialBoardData);

  // handler functions

  const handleDeleteTicket = (ticketIdToDelete: string) => {
    const newBoardData = boardData.map(column => ({
      ...column,
      tickets: column.tickets.filter(ticket => ticket.id !== ticketIdToDelete),
    }));
    setBoardData(newBoardData);
  };

  const handleAddTicket = (columnTitle: string) => {
    const ticketTitle = prompt("Enter the new ticket title:");
    // proceeds if the user enters in prompt
    if (!ticketTitle) return; 

    const ticketCategory = prompt("Enter the category of this new ticket:");
    if (!ticketCategory) return;

    const newTicket = {
      id: `MBA-${Date.now()}`,
      title: ticketTitle,
      category: ticketCategory, 
    };

    const newBoardData = boardData.map(column => {
      if (column.title === columnTitle) {
        return { ...column, tickets: [...column.tickets, newTicket] };
      }
      return column;
    });

    setBoardData(newBoardData);
  };

  // jsx return
  return (
    <main className="kanban-board">
      {boardData.map((column) => (
        <KanbanColumn
          key={column.title}
          title={column.title}
          ticketCount={column.tickets.length}
          tickets={column.tickets}
          onDeleteTicket={handleDeleteTicket}
          onAddTicket={handleAddTicket} 
        />
      ))}
    </main>
  );
}

