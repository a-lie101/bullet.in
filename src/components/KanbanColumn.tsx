// src/components/KanbanColumn.tsx
import TicketCard from './TicketCard';

// Define the types for the props this component will receive
type Ticket = {
  id: string;
  title: string;
  category: string;
};

type KanbanColumnProps = {
  title: string;
  ticketCount: number;
  tickets: Ticket[];
};

// This component displays a full column with its tickets
export default function KanbanColumn({ title, ticketCount, tickets }: KanbanColumnProps) {
  return (
    <div className="kanban-column">
      <div className="column-header">
        <h3>{title} <span className="ticket-count">{ticketCount}</span></h3>
      </div>
      <div className="column-body">
        {/* We loop over the tickets array and render a card for each one */}
        {tickets.map(ticket => (
          <TicketCard 
            key={ticket.id} 
            id={ticket.id} 
            title={ticket.title} 
            category={ticket.category} 
          />
        ))}
      </div>
      <button className="create-button">+ Create</button>
    </div>
  );
}