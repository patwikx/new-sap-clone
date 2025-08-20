import { PrismaClient, RoomStatus, HousekeepingStatus } from '@prisma/client'

const prisma = new PrismaClient()

// --- Configuration ---
// Define the business units you want to create or use.
// The script will find a business unit with this name or create a new one.
const businessUnitNames = [
  "Tropicana Beach Resort",
  "Lakeview Mountain Resort",
  "City Center Hotel & Spa",
  "Seaside Villas Gensan",
]

// Define the types of accommodations (room types) to be created.
const accommodationTypes = [
  { name: 'Standard Room', type: 'ROOM', capacity: 2, pricePerNight: 3500 },
  { name: 'Deluxe Room', type: 'ROOM', capacity: 2, pricePerNight: 4500 },
  { name: 'Family Suite', type: 'SUITE', capacity: 4, pricePerNight: 7000 },
  { name: 'Beachfront Villa', type: 'VILLA', capacity: 6, pricePerNight: 12000 },
  { name: 'Honeymoon Cottage', type: 'COTTAGE', capacity: 2, pricePerNight: 8500 },
]

// Define how many rooms of each type to create per business unit.
const roomsPerAccommodation = 5

// --- Main Seeding Function ---
async function main() {
  console.log(`🌱 Start seeding ...`)

  for (const buName of businessUnitNames) {
    // 1. Upsert Business Unit
    const businessUnit = await prisma.businessUnit.upsert({
      where: { id: `bu_${buName.toLowerCase().replace(/ /g, '_')}` }, // Custom, predictable ID
      update: {},
      create: {
        id: `bu_${buName.toLowerCase().replace(/ /g, '_')}`,
        name: buName,
        functionalCurrency: 'PHP',
        location: 'General Santos City',
      },
    })
    console.log(`🏢 Created or found business unit: ${businessUnit.name}`)

    // 2. Create Accommodations (Room Types) for the Business Unit
    for (const accommType of accommodationTypes) {
      const accommodation = await prisma.accommodation.upsert({
        where: {
          // A unique constraint is needed here. Let's create one based on name and BU.
          // Note: Your schema doesn't enforce this, so the seed script handles it logically.
          // We'll generate a predictable ID to make it work.
          id: `accomm_${businessUnit.id}_${accommType.name.toLowerCase().replace(/ /g, '_')}`,
        },
        update: {},
        create: {
          id: `accomm_${businessUnit.id}_${accommType.name.toLowerCase().replace(/ /g, '_')}`,
          businessUnitId: businessUnit.id,
          name: accommType.name,
          type: accommType.type as any, // Cast because enum types can be tricky
          capacity: accommType.capacity,
          pricePerNight: accommType.pricePerNight,
          description: `A lovely ${accommType.name} at ${businessUnit.name}.`,
          amenities: ['Wi-Fi', 'Air Conditioning', 'Hot Shower'],
        },
      })
      console.log(`  🏠 Created or found accommodation type: ${accommodation.name}`)

      // 3. Create individual Rooms for this Accommodation type
      for (let i = 1; i <= roomsPerAccommodation; i++) {
        const roomNumber = `${accommType.name.substring(0, 1)}${100 + i}` // e.g., S101, D102

        await prisma.room.upsert({
          where: {
            businessUnitId_roomNumber: {
              businessUnitId: businessUnit.id,
              roomNumber: roomNumber,
            },
          },
          update: {},
          create: {
            businessUnitId: businessUnit.id,
            accommodationId: accommodation.id,
            roomNumber: roomNumber,
            status: RoomStatus.AVAILABLE,
            housekeepingStatus: HousekeepingStatus.CLEAN,
            floor: 1, // Simple logic, can be improved
          },
        })
      }
      console.log(`    🚪 Created ${roomsPerAccommodation} rooms for ${accommodation.name} (e.g., ${accommType.name.substring(0, 1)}101).`)
    }
  }

  console.log(`✅ Seeding finished.`)
}

// --- Execute ---
main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })