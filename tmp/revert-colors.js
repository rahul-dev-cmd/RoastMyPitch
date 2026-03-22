import fs from 'fs';
import path from 'path';

const tsxPath = path.resolve('c:/Users/nikit/Downloads/roastmypitch/src/App.tsx');
let content = fs.readFileSync(tsxPath, 'utf8');

// 1. Revert texts back to white
content = content.replace(/text-black\/50 font-medium/g, 'text-white/50 font-medium');
content = content.replace(/text-black\/60 font-semibold/g, 'text-white/60 font-medium');
content = content.replace(/text-black\/70 font-semibold/g, 'text-white/70 font-medium');
content = content.replace(/text-black\/80 font-semibold/g, 'text-white/80 font-medium');
content = content.replace(/text-black\/80 font-bold/g, 'text-white/90 font-medium');
content = content.replace(/text-black font-bold/g, 'text-white font-bold');
content = content.replace(/text-black font-semibold/g, 'text-white font-medium');

// Revert specific utility swaps
content = content.replace(/text-black\/80 hover:text-black font-bold/g, 'text-white/60 hover:text-white font-medium');
content = content.replace(/<ArrowRight className="w-8 h-8 text-black" \/>/g, '<ArrowRight className="w-8 h-8 text-white" />');
content = content.replace(/text-\[10px\] font-bold uppercase tracking-\[0.2em\] text-black\/60/g, 'text-[10px] font-bold uppercase tracking-[0.2em] text-white/40');
content = content.replace(/disabled:opacity-30 text-black font-medium/g, 'disabled:opacity-30 text-white font-medium');
content = content.replace(/bg-black\/10 backdrop-blur-xl text-black font-bold/g, 'bg-blue-900/30 backdrop-blur-xl text-white font-medium');
content = content.replace(/placeholder:text-black\/50/g, 'placeholder:text-white/50');
content = content.replace(/text-black\/60 hover:text-black\/80/g, 'text-white/60 hover:text-white/90');
content = content.replace(/text-black\/60/g, 'text-white/60');
content = content.replace(/text-black\/50/g, 'text-white/50');
content = content.replace(/text-black/g, 'text-white');

// 2. Make boxes transparent blue
content = content.replace(/bg-black\/10/g, 'bg-blue-900/30');
content = content.replace(/bg-black\/20/g, 'bg-blue-900/40');
content = content.replace(/bg-black\/30/g, 'bg-blue-900/50');
content = content.replace(/bg-black\/40/g, 'bg-blue-900/60');
content = content.replace(/bg-[#151619]\/80/g, 'bg-blue-950/60');

// Fix border classes for the blue theme
content = content.replace(/border-black\/5/g, 'border-blue-400/20');
content = content.replace(/border-black\/10/g, 'border-blue-400/20');
content = content.replace(/border-black\/20/g, 'border-blue-400/30');
content = content.replace(/border-black\/40/g, 'border-blue-400/40');
content = content.replace(/border-black\/50/g, 'border-blue-400/50');

fs.writeFileSync(tsxPath, content, 'utf8');
console.log('Successfully applied transparent blue theme and reverted text to white.');
