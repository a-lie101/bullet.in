// src/app/page.tsx

"use client";
import KanbanColumn from "@/components/KanbanColumn";
import './globals.css';

import { useState } from "react";

// Mock data representing the state of the Kanban board
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

// This is your main page component
export default function DashboardPage() {

  const [boardData, setBoardData] = useState(initialBoardData); 

  const handleDeleteTicket = (ticketIdToDelete: string) => {
    const newBoardData = boardData.map(column => ({
      ...column,
      tickets: column.tickets.filter(ticket => ticket.id !== ticketIdToDelete),
    }));
    setBoardData(newBoardData);
  };

  const handleAddTicket = (columnTitle: string) => {
    const ticketTitle = prompt("Enter the new ticket title:");
    const ticketCategory = prompt("Enter the category of this new ticket:");
  
    if (ticketTitle) {
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

      // ✅ This function also correctly calls setBoardData
      setBoardData(newBoardData);
    }
  };
  return (
    <main className="kanban-board">
      {/* We map over our board data to create a column for each status */}
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

