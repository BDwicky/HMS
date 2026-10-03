import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🏨 Seeding Marina Bay Sands luxury inventory...");

  // Update hotel settings
  await prisma.hotelSetting.updateMany({
    data: {
      hotelName: "Marina Bay Sands Singapore",
      address: "10 Bayfront Avenue",
      city: "Singapore",
      country: "Singapore",
      phone: "+65 6688 8888",
      email: "inquiries@marinabaysands.com",
      website: "https://www.marinabaysands.com",
      currency: "IDR",
      taxPercent: 10,
      serviceChargePercent: 10,
    },
  });

  // Create RatePlan
  await prisma.ratePlan.upsert({
    where: { code: "BEST-FLEX" },
    update: {
      name: "Sands Best Available Rate",
      description: "Tarif fleksibel resmi Marina Bay Sands dengan sarapan gourmet & akses SkyPark Infinity Pool.",
      includesBreakfast: true,
      isRefundable: true,
    },
    create: {
      code: "BEST-FLEX",
      name: "Sands Best Available Rate",
      description: "Tarif fleksibel resmi Marina Bay Sands dengan sarapan gourmet & akses SkyPark Infinity Pool.",
      includesBreakfast: true,
      isRefundable: true,
    },
  });

  // Room Types
  const types = [
    {
      code: "DLX-KNG",
      name: "Sands Premier King Room",
      description:
        "Kamar mewah seluas 47m² dengan pemandangan Marina Bay atau cakrawala kota, tempat tidur King berbalut katun Mesir, kamar mandi marmer mewah, dan akses eksklusif ke Infinity Pool rooftop lantai 57.",
      maxOccupancy: 2,
      basePrice: 1850000,
      amenities: [
        "Akses Infinity Pool 57F",
        "King Bed Mewah",
        "Pemandangan Teluk/Kota",
        "WiFi 6 Ultra Cepat",
        "Kamar Mandi Marmer & Bathtub",
        "Mesin Kopi Nespresso",
      ],
      imageUrls: ["/images/suite-deluxe.jpg"],
      rooms: ["1201", "1202", "1203", "1204", "1205", "1401", "1402", "1403"],
    },
    {
      code: "CLB-STE",
      name: "Sands Grand Club Suite",
      description:
        "Suite prestisius seluas 75m² dengan ruang tamu terpisah, akses VIP eksklusif ke Club55 Lounge di lantai 55 dengan afternoon tea gratis, koktail malam, dan sarapan gourmet.",
      maxOccupancy: 3,
      basePrice: 3450000,
      amenities: [
        "Akses Infinity Pool 57F",
        "Akses VIP Club55 Lounge",
        "Afternoon Tea & Cocktails",
        "Kamar Mandi Marmer & Jacuzzi",
        "Balkon Pribadi Menghadap Teluk",
        "Sarapan Prasmanan Mewah",
      ],
      imageUrls: ["/images/suite-premier.jpg"],
      rooms: ["2501", "2502", "2503", "2504", "2801", "2802"],
    },
    {
      code: "CHM-STE",
      name: "Chairman Presidential Suite",
      description:
        "Puncak kemewahan setinggi langit seluas 145m² dengan 2 kamar tidur utama, ruang makan mewah, fasilitas sauna pribadi, layanan pelayan (butler) pribadi 24 jam, dan penjemputan Rolls-Royce.",
      maxOccupancy: 5,
      basePrice: 7950000,
      amenities: [
        "Akses Infinity Pool 57F",
        "Dedicated 24-Hour Butler",
        "Antar-Jemput Limousine Bandara",
        "Sauna Pribadi & Ruang Pijat",
        "Grand Piano & Ruang Tamu Mewah",
        "Pemandangan Panorama 360°",
      ],
      imageUrls: ["/images/suite-family.jpg"],
      rooms: ["5001", "5002", "5201"],
    },
  ];

  for (const t of types) {
    const rt = await prisma.roomType.upsert({
      where: { code: t.code },
      update: {
        name: t.name,
        description: t.description,
        maxOccupancy: t.maxOccupancy,
        basePrice: t.basePrice,
        amenities: t.amenities,
        imageUrls: t.imageUrls,
      },
      create: {
        code: t.code,
        name: t.name,
        description: t.description,
        maxOccupancy: t.maxOccupancy,
        basePrice: t.basePrice,
        amenities: t.amenities,
        imageUrls: t.imageUrls,
      },
    });

    for (const rNum of t.rooms) {
      await prisma.room.upsert({
        where: { roomNumber: rNum },
        update: { roomTypeId: rt.id, status: "AVAILABLE" },
        create: {
          roomNumber: rNum,
          roomTypeId: rt.id,
          floor: parseInt(rNum.substring(0, 2)),
          status: "AVAILABLE",
        },
      });
    }

    console.log(`  ✓ RoomType "${t.name}" (${t.code}) upserted with ${t.rooms.length} rooms`);
  }

  console.log("✨ Marina Bay Sands seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
