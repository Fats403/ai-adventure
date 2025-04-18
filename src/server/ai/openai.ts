import OpenAI from "openai";
import { env } from "@/env.js";
import { InitialGameStateSchema, type InitialGameState } from "@/lib/zod/game";
import { ZodError } from "zod";

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are a creative storyteller and game master for a collaborative text-based adventure game.
Your goal is to kickstart an engaging adventure based on a user-provided concept.
You must generate an initial scenario, a description for an accompanying image, and four distinct starting options for the player.
The response MUST be a valid JSON object adhering strictly to the following format:
{
  "scenario": "string",
  "imageDescription": "string",
  "options": ["string", "string", "string", "string"]
}

RULES:
- The scenario should set the scene based on the adventure concept. Make it intriguing but brief (3-5 sentences).
- The imageDescription should vividly describe the scene for an AI image generator (e.g., DALL-E). Focus on visual elements, mood, and style.
- The four options must be distinct, actionable choices for the first turn. They should logically follow from the scenario.
- Ensure the JSON is perfectly formatted. Do not include any text outside the JSON structure.
- Do not use markdown in the JSON output.

EXAMPLE:
If the concept is "A group of adventurers seeking a lost artifact in a haunted forest", a good response would be:
{
  "scenario": "The gnarled trees of the Shadowwood loom over you, their branches clawing at the twilight sky. A chilling wind whispers through the leaves, carrying the scent of decay and ancient magic. Somewhere deeper within lies the Sunstone Amulet, but the forest guards its secrets fiercely.",
  "imageDescription": "Digital painting style. A dense, spooky forest at twilight. Gnarled, moss-covered trees with twisted branches forming a canopy overhead. Faint ethereal mist hangs in the air. A narrow, overgrown path leads deeper into the darkness. The mood is eerie and foreboding.",
  "options": [
    "Light a torch and cautiously follow the overgrown path.",
    "Listen closely to the sounds of the forest for clues.",
    "Search the immediate area near the forest edge for tracks.",
    "Cast a simple protective ward before proceeding."
  ]
}`;

export async function generateInitialGameState(
  concept: string,
): Promise<InitialGameState> {
  console.log("Generating initial game state for concept:", concept);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Adventure Concept: "${concept}"` },
      ],
      temperature: 0.8, // Increase creativity slightly
      response_format: { type: "json_object" }, // Enforce JSON output
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error("OpenAI response content is empty.");
    }

    console.log("Raw OpenAI Response:", content);

    // Parse and validate the response
    const parsed = JSON.parse(content);
    const validatedState = InitialGameStateSchema.parse(parsed);

    console.log("Validated Initial Game State:", validatedState);
    return validatedState;
  } catch (error) {
    if (error instanceof ZodError) {
      console.error("Zod validation error:", error.errors);
      throw new Error(`AI response failed validation: ${error.message}`);
    }
    if (error instanceof OpenAI.APIError) {
      console.error("OpenAI API Error:", error);
      throw new Error(`OpenAI API error: ${error.status} ${error.message}`);
    }
    console.error("Error generating initial game state:", error);
    // Re-throw a generic error or handle specific cases
    throw new Error("Failed to generate initial game state from AI.");
  }
}
