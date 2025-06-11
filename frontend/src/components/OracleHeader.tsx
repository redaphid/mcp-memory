const OracleHeader = () => {
  return (
    <header className="relative z-10 text-center py-8 px-4">
      <h1 className="horror-font text-6xl md:text-8xl blood-text flicker mb-4">
        THE MEMORY ORACLE
      </h1>
      <p className="eerie-font text-2xl text-purple-300 float">
        "Every memory has its price..."
      </p>
      <div className="mt-4 text-yellow-500 text-xl">
        ⚠️ <span className="glitch" data-text="Insert coin to disturb the past">Insert coin to disturb the past</span> ⚠️
      </div>
    </header>
  );
};

export default OracleHeader;
