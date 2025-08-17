// src/components/TicketCard.tsx

// Define the shape of the ticket data using TypeScript for type safety
type TicketCardProps = {
    id: string;
    title: string;
    category: string;
  };
  
  // This is a React component that displays a single ticket
  export default function TicketCard({ id, title, category }: TicketCardProps) {
    return (
      <div className="ticket-card">
        <p>{title}</p>
        <div className="ticket-info">
          <p>Category: <span className="ticket-category">{category}</span></p>
        </div>
        {/* The user icon would go here */}
      </div>
    );
  }