import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const code = '123';
    console.log(`Checking coupon with code: ${code}`);

    const coupon = await prisma.coupon.findUnique({
      where: { code: code },
      include: {
        restaurant: true,
        place: true,
      },
    });

    if (coupon) {
      console.log('Coupon found:');
      console.log(JSON.stringify(coupon, null, 2));

      // Check validity
      const now = new Date();
      console.log('Current time:', now.toISOString());
      console.log('Valid from:', coupon.validFrom.toISOString());
      console.log('Valid until:', coupon.validUntil.toISOString());
      console.log('Is active:', coupon.isActive);

      if (now < coupon.validFrom) console.log('Status: Not yet valid');
      else if (now > coupon.validUntil) console.log('Status: Expired');
      else console.log('Status: Currently valid date range');
    } else {
      console.log('Coupon not found.');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
