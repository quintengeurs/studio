'use server';
/**
 * @fileOverview An AI agent that clarifies issue descriptions and suggests relevant asset categories.
 *
 * - aiIssueClarificationAndCategorization - A function that handles the issue clarification and categorization process.
 * - IssueClarificationInput - The input type for the aiIssueClarificationAndCategorization function.
 * - IssueClarificationOutput - The return type for the aiIssueClarificationAndCategorization function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IssueClarificationInputSchema = z.object({
  description: z.string().describe("A brief description of the issue reported by an operative."),
});
export type IssueClarificationInput = z.infer<typeof IssueClarificationInputSchema>;

const IssueClarificationOutputSchema = z.object({
  clarifiedDescription: z.string().describe("An expanded and clarified version of the issue description, making it more detailed and understandable."),
  suggestedCategories: z.array(z.string()).describe("A list of relevant asset categories that the issue pertains to, such as 'Playground Equipment', 'Tree Maintenance', 'Park Furniture', 'Waste Management', 'Pathways', 'Water Features', 'Lighting', 'Sports Facilities'."),
});
export type IssueClarificationOutput = z.infer<typeof IssueClarificationOutputSchema>;

export async function aiIssueClarificationAndCategorization(input: IssueClarificationInput): Promise<IssueClarificationOutput> {
  return issueClarificationFlow(input);
}

const issueClarificationPrompt = ai.definePrompt({
  name: 'issueClarificationPrompt',
  input: {schema: IssueClarificationInputSchema},
  output: {schema: IssueClarificationOutputSchema},
  prompt: `You are an AI assistant designed to clarify issue descriptions for park operatives and suggest relevant asset categories.

Your task is to:
1.  **Clarify and Enrich**: Expand on the brief description provided by the operative, making it more detailed and understandable for someone who needs to allocate or resolve the issue. Ensure the output is concise but informative.
2.  **Suggest Asset Categories**: Based on the clarified description, identify and list relevant asset categories that the issue pertains to. Choose from common categories like 'Playground Equipment', 'Tree Maintenance', 'Park Furniture', 'Waste Management', 'Pathways', 'Water Features', 'Lighting', 'Sports Facilities', 'Fencing', 'Horticulture', 'Sports Pitches', 'Public Art', 'Toilets', 'Car Parks', 'Benches', 'Bins', or suggest new, highly relevant categories if none fit perfectly.

Input Description: {{{description}}}`,
});

const issueClarificationFlow = ai.defineFlow(
  {
    name: 'issueClarificationFlow',
    inputSchema: IssueClarificationInputSchema,
    outputSchema: IssueClarificationOutputSchema,
  },
  async input => {
    const {output} = await issueClarificationPrompt(input);
    return output!;
  }
);
