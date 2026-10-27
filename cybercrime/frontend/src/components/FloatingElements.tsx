import { Shield, Lock, Terminal, Code, Database, Cpu, Wifi, Activity } from "lucide-react";

export function FloatingElements() {
  const icons = [
    { Icon: Shield, delay: 0, duration: 20, left: '10%', color: 'text-emerald-400' },
    { Icon: Lock, delay: 2, duration: 25, left: '85%', color: 'text-cyan-400' },
    { Icon: Terminal, delay: 4, duration: 22, left: '15%', color: 'text-purple-400' },
    { Icon: Code, delay: 6, duration: 24, left: '90%', color: 'text-emerald-400' },
    { Icon: Database, delay: 1, duration: 23, left: '5%', color: 'text-cyan-400' },
    { Icon: Cpu, delay: 3, duration: 21, left: '95%', color: 'text-purple-400' },
    { Icon: Wifi, delay: 5, duration: 26, left: '20%', color: 'text-emerald-400' },
    { Icon: Activity, delay: 7, duration: 19, left: '80%', color: 'text-cyan-400' },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {icons.map((item, index) => (
        <div
          key={index}
          className="absolute"
          style={{
            left: item.left,
            animation: `float ${item.duration}s ease-in-out infinite`,
            animationDelay: `${item.delay}s`,
          }}
        >
          <item.Icon 
            className={`w-6 h-6 ${item.color} opacity-10`} 
            style={{
              filter: 'blur(1px)',
            }}
          />
        </div>
      ))}

      {/* Binary code floating */}
      <div className="absolute top-1/4 left-1/3 font-mono text-emerald-400/10 text-xs animate-pulse">
        01001000 01100001 01100011 01101011
      </div>
      <div className="absolute bottom-1/3 right-1/4 font-mono text-cyan-400/10 text-xs animate-pulse" style={{ animationDelay: '1s' }}>
        01010011 01100101 01100011 01110101
      </div>

      {/* Data streams */}
      <div className="absolute top-0 left-1/2 w-px h-32 bg-gradient-to-b from-emerald-400/0 via-emerald-400/20 to-emerald-400/0 animate-pulse"></div>
      <div className="absolute bottom-0 right-1/4 w-px h-48 bg-gradient-to-t from-cyan-400/0 via-cyan-400/20 to-cyan-400/0 animate-pulse" style={{ animationDelay: '2s' }}></div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          25% {
            transform: translateY(-30vh) rotate(90deg);
          }
          50% {
            transform: translateY(-60vh) rotate(180deg);
          }
          75% {
            transform: translateY(-90vh) rotate(270deg);
          }
        }
      `}</style>
    </div>
  );
}
