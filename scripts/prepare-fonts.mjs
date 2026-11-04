import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
export function validOpenType(bytes){
 if(bytes.length<1024)return false;
 const magic=bytes.toString('latin1',0,4);if(!['OTTO','\u0000\u0001\u0000\u0000'].includes(magic))return false;
 const count=bytes.readUInt16BE(4);if(count<1||count>200||12+count*16>bytes.length)return false;
 const tags=new Set();for(let i=0;i<count;i++){const offset=12+i*16;const start=bytes.readUInt32BE(offset+8),length=bytes.readUInt32BE(offset+12);if(start+length>bytes.length)return false;tags.add(bytes.toString('ascii',offset,offset+4));}
 return ['name','cmap','head'].every(tag=>tags.has(tag));
}
export async function prepareFonts(root='app/public/fonts'){
 await mkdir(root,{recursive:true});const weights={Light:300,Regular:400,Medium:500,Bold:700,Black:900};const faces=[];
 for(const [name,weight] of Object.entries(weights)){const file=`thmanyahserifdisplay-${name}.otf`;let bytes;try{bytes=await readFile(path.join(root,file));}catch(error){if(error.code==='ENOENT')continue;throw error;}if(!validOpenType(bytes))throw Error(`${file} is not a valid font. Use the real OpenType file, not its macOS ._ metadata companion.`);faces.push(`@font-face{font-family:Thmanyah;src:url('./${file}') format('opentype');font-style:normal;font-weight:${weight};font-display:swap;}`);}
 const css=faces.length?`${faces.join('\n')}\n:root:root{--font-ar:Thmanyah;--font-en:Thmanyah}\n`:'/* Thmanyah awaits valid original OTF files. No metadata files or substitute fonts are declared as Thmanyah. */\n';await writeFile(path.join(root,'fonts.css'),css);return faces.length;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const count=await prepareFonts();console.log(count?`Prepared ${count} authentic Thmanyah font faces for both languages.`:'Thmanyah originals unavailable; existing fonts retained.');}
