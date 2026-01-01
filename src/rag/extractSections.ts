export function extractLLMSections(markdownContent: string): string {
  const sections = [
    'Executive Summary',
    'Temi della settimana',
    'Segnali da monitorare',
    'Divergenze (Articoli vs Reddit)',
  ];
  
  let extracted = '';
  
  for (const section of sections) {
    const regex = new RegExp(`## ${section}([\\s\\S]*?)(?=##|$)`, 'i');
    const match = markdownContent.match(regex);
    
    if (match && match[1]) {
      extracted += `## ${section}\n${match[1].trim()}\n\n`;
    }
  }
  
  return extracted.trim();
}
