// MintNFTPage.jsx
import React from "react";

// Sample data for multiple NFT cards
const contributions = [
  {
    id: '123-456-789',
    donor: 'Alex Doe',
    cause: 'Hope Initiative',
    date: '08.06.2025',
    imageUrl: 'https://placehold.co/340x200/1a202c/a7f3d0?text=NFT+1',
    ngo: 'KindHeart NGO'
  },
  {
    id: '987-654-321',
    donor: 'Jane Smith',
    cause: 'Clean Water Project',
    date: '07.22.2025',
    imageUrl: 'https://placehold.co/340x200/1a202c/818cf8?text=NFT+2',
    ngo: 'AquaLife Org'
  },
  {
    id: '456-789-123',
    donor: 'Sam Wilson',
    cause: 'Forest Restoration',
    date: '06.15.2025',
    imageUrl: 'https://placehold.co/340x200/1a202c/fcd34d?text=NFT+3',
    ngo: 'EcoWarriors'
  },
  {
    id: '321-654-987',
    donor: 'Maria Garcia',
    cause: 'Youth Education Fund',
    date: '05.30.2025',
    imageUrl: 'https://placehold.co/340x200/1a202c/fb923c?text=NFT+4',
    ngo: 'Future Minds'
  },
  {
    id: '654-321-789',
    donor: 'Chen Wei',
    cause: 'Animal Shelter Support',
    date: '04.18.2025',
    imageUrl: 'https://placehold.co/340x200/1a202c/f472b6?text=NFT+5',
    ngo: 'Paws & Claws'
  },
  {
    id: '789-123-456',
    donor: 'David Johnson',
    cause: 'Community Health Drive',
    date: '03.05.2025',
    imageUrl: 'https://placehold.co/340x200/1a202c/60a5fa?text=NFT+6',
    ngo: 'HealthForAll'
  },
];

// Card component
function Card({ imgSrc, title, description, donor, id, date, ngo }) {
  return (
    <div className="custom-card">
      <img src={imgSrc} alt={title} className="custom-card-img" />
      <div className="custom-card-body">
        <h3 className="custom-card-title">{title}</h3>
        <p className="custom-card-desc">{description}</p>
        <div className="custom-card-meta">
          <span>Donor: <strong>{donor}</strong></span>
          <span>NGO: {ngo}</span>
        </div>
        <div className="custom-card-footer">
          <span>ID: {id.substring(0, 9)}...</span>
          <span>{date}</span>
        </div>
      </div>
    </div>
  );
}

// Main page component
export default function MintNFTPage() {
  return (
    <div className="mint-nft-page">
      <header className="mint-nft-header">
        <h1>Your Contributions, Immortalized</h1>
        <p>A gallery of gratitude for the support from our community.</p>
      </header>
      <div className="mint-nft-grid">
        {contributions.map((c) => (
          <Card
            key={c.id}
            imgSrc={c.imageUrl}
            title={c.cause}
            description={`Thank you for supporting "${c.cause}"!`}
            donor={c.donor}
            id={c.id}
            date={c.date}
            ngo={c.ngo}
          />
        ))}
      </div>
      <footer className="mint-nft-footer">
        <p className="mint-nft-footer-small">All contributions are securely recorded on the XRPL Ledger and they're everlasting tokens of your gratitude!</p>
      </footer>
      {/* Inline CSS for the page and cards */}
      <style>{`
        .mint-nft-page {
          min-height: 100vh;
          background: #c1dfff;
          color: #fff;
          font-family: 'Inter', Arial, sans-serif;
          padding: 0 0 40px 0;
        }
        .mint-nft-header {
          text-align: center;
          padding: 40px 0 24px 0;
        }
        .mint-nft-header h1 {
          font-size: 2.5rem;
          font-weight: 800;
          margin: 0 0 12px 0;
          letter-spacing: -1px;
        }
        .mint-nft-header p {
          color: #010203;
          font-size: 1.15rem;
          margin: 0;
        }
        .mint-nft-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 2rem;
          justify-content: center;
          padding: 0 2rem;
        }
        .custom-card {
          background: #23272f;
          border-radius: 1.2rem;
          box-shadow: 0 6px 32px rgba(0,0,0,0.18), 0 1.5px 5px rgba(0,0,0,0.08);
          overflow: hidden;
          max-width: 340px;
          width: 100%;
          margin: 0 auto;
          transition: transform 0.18s cubic-bezier(.4,2,.6,1), box-shadow 0.18s;
          display: flex;
          flex-direction: column;
        }
        .custom-card:hover {
          transform: translateY(-6px) scale(1.04);
          box-shadow: 0 12px 36px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.10);
        }
        .custom-card-img {
          width: 100%;
          height: 200px;
          object-fit: cover;
          display: block;
        }
        .custom-card-body {
          padding: 1.2rem 1.5rem 1rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .custom-card-title {
          color: #fff;
          font-size: 1.3rem;
          margin: 0 0 0.25rem 0;
          font-weight: 700;
        }
        .custom-card-desc {
          color: #b0b6c2;
          font-size: 1rem;
          margin: 0 0 0.5rem 0;
        }
        .custom-card-meta {
          display: flex;
          flex-direction: column;
          color: #7ee787;
          font-size: 0.96rem;
          gap: 0.1rem;
        }
        .custom-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #8b949e;
          font-size: 0.89rem;
          border-top: 1px solid #2d333b;
          margin-top: 0.8rem;
          padding-top: 0.5rem;
        }
        .mint-nft-footer {
          text-align: center;
          color: #b0b6c2;
          margin-top: 48px;
        }
        .mint-nft-footer-small {
            font-size: 0.93rem;
            color: #000000;
            margin-top: 18px;
            opacity: 0.85;
            letter-spacing: 0.01em;
            border-top: 1px solid #23272f;
            padding-top: 1.1em;
            text-align: center;
            font-weight: 400;
          }          
        @media (max-width: 900px) {
          .mint-nft-grid {
            gap: 1.2rem;
          }
        }
        @media (max-width: 700px) {
          .mint-nft-header h1 {
            font-size: 2rem;
          }
          .mint-nft-grid {
            flex-direction: column;
            gap: 1.5rem;
            padding: 0 1rem;
          }
        }
      `}</style>
    </div>
  );
}
