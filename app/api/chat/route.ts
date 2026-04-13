import { streamText, convertToModelMessages, stepCountIs } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function getModel(provider: string, apiKey: string) {
  switch (provider) {
    case 'anthropic':
      return createAnthropic({ apiKey })('claude-haiku-4-5')
    case 'openai':
      return createOpenAI({ apiKey })('gpt-4o-mini')
    default:
      return createGroq({ apiKey: process.env.GROQ_API_KEY! })('llama-3.1-8b-instant')
  }
}

const SYSTEM_PROMPT = `You are a friendly local food guide for FarmFoodFinder.
You help people find fresh food from nearby farms and farmers markets.
You know what's in season, can help plan farm-to-table meals, and can find farms
or markets near the user based on what they're looking for.
Be conversational, helpful, and specific. When you find farms or markets,
describe what makes each one worth visiting.`

export async function POST(req: Request) {
  const { messages, provider = 'default', apiKey = '', userLat, userLng, radiusMiles = 25 } = await req.json()

  const model = getModel(provider, apiKey)

  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages: convertToModelMessages(messages),
    tools: {
      find_nearby_farms: {
        description: 'Find farms near the user that sell specific products',
        inputSchema: z.object({
          productCategory: z.string().optional().describe('Category to filter by: eggs, beef, pork, poultry, dairy, vegetables, fruit, honey, flowers, CSA, bread, other'),
        }),
        execute: async ({ productCategory }: { productCategory?: string }) => {
          const radiusMeters = radiusMiles * 1609.34
          const { data, error } = await supabase.rpc('farms_within_radius', {
            user_lat: userLat,
            user_lng: userLng,
            radius_meters: radiusMeters,
          })
          if (error) return { error: error.message, farms: [] }
          return { farms: data ?? [], count: data?.length ?? 0 }
        },
      },

      find_farmers_markets: {
        description: 'Find farmers markets near the user',
        inputSchema: z.object({
          dayOfWeek: z.string().optional().describe('Filter by day, e.g. Saturday'),
        }),
        execute: async ({ dayOfWeek }: { dayOfWeek?: string }) => {
          const radiusMeters = radiusMiles * 1609.34
          const { data, error } = await supabase.rpc('markets_within_radius', {
            user_lat: userLat,
            user_lng: userLng,
            radius_meters: radiusMeters,
          })
          if (error) return { error: error.message, markets: [] }
          let markets = data ?? []
          if (dayOfWeek && markets.length) {
            markets = markets.filter((m: any) =>
              m.schedule?.some((s: any) =>
                s.day?.toLowerCase().includes(dayOfWeek.toLowerCase())
              )
            )
          }
          return { markets, count: markets.length }
        },
      },

      get_seasonal_produce: {
        description: 'Get what produce is in season right now in a given US state',
        inputSchema: z.object({
          state: z.string().describe('2-letter US state code'),
          month: z.number().min(1).max(12).describe('Month number 1-12'),
        }),
        execute: async ({ state, month }: { state: string; month: number }) => {
          const seasonal: Record<number, string[]> = {
            1: ['citrus', 'root vegetables', 'winter squash', 'kale', 'Brussels sprouts'],
            2: ['citrus', 'root vegetables', 'kale', 'leeks', 'turnips'],
            3: ['asparagus', 'spinach', 'peas', 'lettuce', 'radishes', 'artichokes'],
            4: ['asparagus', 'spring greens', 'peas', 'strawberries', 'spinach', 'rhubarb'],
            5: ['strawberries', 'asparagus', 'peas', 'lettuce', 'radishes', 'herbs'],
            6: ['strawberries', 'blueberries', 'cherries', 'summer squash', 'beans', 'cucumber'],
            7: ['tomatoes', 'corn', 'peaches', 'blueberries', 'peppers', 'beans', 'zucchini'],
            8: ['tomatoes', 'corn', 'peaches', 'melons', 'peppers', 'eggplant', 'okra'],
            9: ['apples', 'pears', 'winter squash', 'sweet potatoes', 'peppers', 'tomatoes'],
            10: ['apples', 'pears', 'pumpkins', 'winter squash', 'sweet potatoes', 'Brussels sprouts'],
            11: ['sweet potatoes', 'winter squash', 'apples', 'kale', 'root vegetables', 'cranberries'],
            12: ['citrus', 'root vegetables', 'winter squash', 'kale', 'Brussels sprouts'],
          }
          return {
            state,
            month,
            inSeason: seasonal[month] ?? [],
            note: 'Availability varies by farm and microclimate. Ask your local farmer what they have right now.',
          }
        },
      },
    },
    stopWhen: stepCountIs(5),
  })

  return result.toUIMessageStreamResponse()
}
