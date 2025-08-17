// src/app/page.tsx
import KanbanColumn from "@/components/KanbanColumn";
import './globals.css';

// Mock data representing the state of the Kanban board
const boardData = [
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

// This is your main page component
export default function DashboardPage() {
  return (
    <main className="kanban-board">
      {/* We map over our board data to create a column for each status */}
      {boardData.map((column) => (
        <KanbanColumn
          key={column.title}
          title={column.title}
          ticketCount={column.tickets.length}
          tickets={column.tickets}
        />
      ))}
    </main>
  );
}