const SmokeEffects = () => {
  return (
    <div className="fixed pointer-events-none">
      <div className="smoke-effect" style={{ top: '10%', left: '10%' }}></div>
      <div className="smoke-effect" style={{ top: '60%', left: '80%', animationDelay: '1s' }}></div>
      <div className="smoke-effect" style={{ top: '80%', left: '30%', animationDelay: '2s' }}></div>
      <div className="smoke-effect" style={{ top: '30%', left: '60%', animationDelay: '3s' }}></div>
    </div>
  );
};

export default SmokeEffects;
