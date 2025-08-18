// src/components/TicketCard.tsx

// Define the shape of the ticket data using TypeScript for type safety
type TicketCardProps = {
    id: string;
    title: string;
    category: string;
    onDelete: (id: string) => void;
  };
  
  // This is a React component that displays a single ticket
  export default function TicketCard({ id, title, category, onDelete }: TicketCardProps) {

    return (
      <div className="ticket-card">
        <p>{title} | <button
          onClick={() => {
            onDelete(id) // When clicked, call onDelete with this card's id
            console.log('deleted');
          }}
          
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#8993a4' }}
        >
          delete
        </button></p>
        <div className="ticket-info">
          <p>Category: <span className="ticket-category">{category}</span></p>
        </div>
        
      </div>
    );
  }