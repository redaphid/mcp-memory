interface CoinSlotProps {
  isOracleActive: boolean;
  wishesRemaining: number;
  onActivate: () => void;
}

const CoinSlot = ({ isOracleActive, wishesRemaining, onActivate }: CoinSlotProps) => {
  return (
    <section className="mb-12 text-center">
      <div className="inline-block">
        <div className="coin-slot w-32 h-2 rounded-full mx-auto mb-4"></div>
        <button
          onClick={onActivate}
          className={`mystical-token px-8 py-4 rounded-full text-xl font-bold hover:scale-110 transition-all cursor-pointer glow ${
            isOracleActive ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={isOracleActive}
        >
          🪙 INSERT COIN
        </button>
        <p className="mt-2 text-purple-400 text-sm">
          <span className="blood-text">{wishesRemaining}</span> wishes remain...
        </p>
      </div>
    </section>
  );
};

export default CoinSlot;
