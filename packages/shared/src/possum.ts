import { z } from 'zod';

export const PossumToneSchema = z.enum(['feral', 'mystical', 'sincere']);
export const DilemmaSchema = z.object({
  question: z.string().trim().min(1, 'Give Percy a dilemma.').max(500),
  optionA: z.string().trim().min(1, 'Add option A.').max(100),
  optionB: z.string().trim().min(1, 'Add option B.').max(100),
  tone: PossumToneSchema,
}).refine(value => value.optionA.normalize('NFKC').toLowerCase() !== value.optionB.normalize('NFKC').toLowerCase(), {
  message: 'Give the two timelines different options.', path: ['optionB'],
});
export type Dilemma = z.infer<typeof DilemmaSchema>;
export type PossumTone = z.infer<typeof PossumToneSchema>;

export const PossumStorySchema = z.object({
  wisdom: z.string().trim().min(1).max(360)
    .describe('The current world: the current timeline selected option actually happens as an answer to the dilemma.'),
  alternate_timeline: z.string().trim().min(1).max(480)
    .describe('A separate world where the alternate timeline selected option actually happens instead. Establish that action or role first, then its consequences. For exclusive choices, the participants exchange roles; do not describe the unselected person losing in the current world.'),
});
export type PossumStory = z.infer<typeof PossumStorySchema>;
export const PossumNarrationRequestSchema = z.object({
  dilemma: DilemmaSchema,
  result: z.union([z.literal(0), z.literal(1)]),
  locale: z.string().regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,2}$/).default('en-US'),
});
export type PossumNarrationRequest = z.infer<typeof PossumNarrationRequestSchema>;
export const PossumNarrationSchema = PossumStorySchema.extend({ source: z.enum(['gemini', 'written']) });
export type PossumNarration = z.infer<typeof PossumNarrationSchema>;

export const PossumMeasurementSchema = z.discriminatedUnion('source', [
  z.object({
    source: z.literal('hardware'), result: z.union([z.literal(0), z.literal(1)]),
    taskArn: z.string().min(1).max(256), deviceArn: z.string().min(1).max(256),
    shot: z.number().int().min(0), bitIndex: z.literal(0), circuitQubits: z.literal(8),
    batchShots: z.number().int().positive().optional(), measuredAt: z.string().datetime({ offset: true }),
  }),
  z.object({
    source: z.literal('classical'), result: z.union([z.literal(0), z.literal(1)]),
    measuredAt: z.string().datetime(), reason: z.enum(['unavailable', 'timeout', 'network']),
  }),
]);
export type PossumMeasurement = z.infer<typeof PossumMeasurementSchema>;
export const PossumDecisionSchema = z.object({
  id: z.string().uuid(), dilemma: DilemmaSchema, createdAt: z.number().int().positive(),
  measurement: PossumMeasurementSchema.optional(), narration: PossumNarrationSchema.optional(),
}).refine(value => !value.narration || !!value.measurement);
export type PossumDecision = z.infer<typeof PossumDecisionSchema>;

/** A failed storyteller never changes the measurement or invents a hardware receipt. */
export function writtenPossumStory(tone: PossumTone): PossumNarration {
  const stories: Record<PossumTone, PossumStory> = {
    feral: {
      wisdom: 'Fate has picked. I have chewed the paperwork. Between us, that is basically a plan.',
      alternate_timeline: 'Over there, a council of raccoons has called an emergency meeting. You are somehow responsible for the minutes.',
    },
    mystical: {
      wisdom: 'One door opens; a thousand stars politely pretend this was their idea. Take a small step through.',
      alternate_timeline: 'Beyond the other portal, the moon has misplaced its reflection. A very small possum is helping it look.',
    },
    sincere: {
      wisdom: 'Here is a little nudge, not a promise. Notice how this choice feels; the next step is still yours.',
      alternate_timeline: 'The other path holds a different ordinary day, with its own small surprises. You do not need to live both to move forward.',
    },
  };
  return { ...stories[tone], source: 'written' };
}
