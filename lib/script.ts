export type ScriptSection = { heading: string; text: string };

export function generateOutline(topic: string, minutes: number): ScriptSection[] {
  const sections = Math.max(6, Math.min(20, Math.floor(minutes / 3)));
  const headings = [
    `Introduction to ${topic}`,
    `Background and Context of ${topic}`,
    `Key Concepts in ${topic}`,
    `Practical Applications of ${topic}`,
    `Case Studies on ${topic}`,
    `Common Misconceptions about ${topic}`,
    `Advanced Topics in ${topic}`,
    `Future Trends around ${topic}`,
    `Challenges and Considerations with ${topic}`,
    `Summary and Takeaways on ${topic}`,
  ];
  const chosen: ScriptSection[] = [];
  for (let i = 0; i < sections; i++) {
    const h = headings[i % headings.length];
    chosen.push({ heading: h, text: expandParagraph(h, topic) });
  }
  return chosen;
}

function expandParagraph(heading: string, topic: string): string {
  const sentences = [
    `${heading} provides a useful starting point to understand ${topic} at a high level.`,
    `We will define core terms and establish an intuitive framework for thinking about ${topic}.`,
    `From there, we connect the ideas to everyday scenarios and practical workflows.`,
    `Where relevant, we will balance trade-offs, outline common pitfalls, and share heuristics that scale.`,
    `Throughout, we emphasize clarity and examples so that concepts become actionable.`,
  ];
  return sentences.join(' ');
}

export function sectionsToSlides(sections: ScriptSection[]): { caption: string }[] {
  const slides: { caption: string }[] = [];
  for (const s of sections) {
    const sentences = s.text.split(/(?<=[.!?])\s+/);
    slides.push({ caption: s.heading });
    for (const sen of sentences) {
      if (sen.trim()) slides.push({ caption: sen.trim() });
    }
  }
  return slides;
}
