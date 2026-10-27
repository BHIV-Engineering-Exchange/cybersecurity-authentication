export function ScanLines() {
  return (
    <>
      {/* Subtle horizontal scan lines */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(16, 185, 129, 0.02) 2px, rgba(16, 185, 129, 0.02) 4px)',
        }}
      />

      <style>{`
        @keyframes scan {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100vh);
          }
        }
      `}</style>
    </>
  );
}