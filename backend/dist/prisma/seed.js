"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting database seed...');
    const demoUser = await prisma.user.upsert({
        where: { email: 'demo@invoiceme.com' },
        update: {},
        create: {
            id: 'demo-user-uuid-1234',
            email: 'demo@invoiceme.com',
            fullName: 'Demo User',
            personalBusinessId: '123456789',
            systemCurrency: 'USD',
        },
    });
    console.log('✅ Created demo user:', demoUser.email);
    const vendors = [
        {
            name: 'AWS',
            displayOrder: 0,
            monthlyLimit: 500.0,
        },
        {
            name: 'Spotify',
            displayOrder: 1,
            monthlyLimit: 15.0,
        },
        {
            name: 'Office Supplies Co',
            displayOrder: 2,
            monthlyLimit: 200.0,
        },
        {
            name: 'Coffee Shop',
            displayOrder: 3,
            monthlyLimit: null,
        },
        {
            name: 'Internet Provider',
            displayOrder: 4,
            monthlyLimit: 100.0,
        },
    ];
    const createdVendors = [];
    for (const vendorData of vendors) {
        const vendor = await prisma.vendor.upsert({
            where: {
                tenantId_name: {
                    tenantId: demoUser.id,
                    name: vendorData.name,
                },
            },
            update: {},
            create: {
                tenantId: demoUser.id,
                ...vendorData,
            },
        });
        createdVendors.push(vendor);
        console.log(`✅ Created vendor: ${vendor.name}`);
    }
    const invoices = [
        {
            vendorId: createdVendors[0].id,
            name: 'AWS Cloud Services - December',
            originalAmount: 450.0,
            originalCurrency: 'USD',
            normalizedAmount: 450.0,
            fxRate: 1.0,
            fxDate: new Date('2025-12-01'),
            invoiceDate: new Date('2025-12-01'),
            invoiceNumber: 'AWS-2025-12-001',
            fileUrl: '/uploads/demo-user-uuid-1234/aws-dec-2025.pdf',
            needsReview: false,
        },
        {
            vendorId: createdVendors[0].id,
            name: 'AWS Cloud Services - January',
            originalAmount: 520.0,
            originalCurrency: 'USD',
            normalizedAmount: 520.0,
            fxRate: 1.0,
            fxDate: new Date('2026-01-01'),
            invoiceDate: new Date('2026-01-01'),
            invoiceNumber: 'AWS-2026-01-001',
            fileUrl: '/uploads/demo-user-uuid-1234/aws-jan-2026.pdf',
            needsReview: false,
        },
        {
            vendorId: createdVendors[1].id,
            name: 'Spotify Premium - December',
            originalAmount: 9.99,
            originalCurrency: 'USD',
            normalizedAmount: 9.99,
            fxRate: 1.0,
            fxDate: new Date('2025-12-05'),
            invoiceDate: new Date('2025-12-05'),
            invoiceNumber: 'SPOT-2025-12',
            fileUrl: '/uploads/demo-user-uuid-1234/spotify-dec-2025.pdf',
            needsReview: false,
        },
        {
            vendorId: createdVendors[1].id,
            name: 'Spotify Premium - January',
            originalAmount: 9.99,
            originalCurrency: 'USD',
            normalizedAmount: 9.99,
            fxRate: 1.0,
            fxDate: new Date('2026-01-05'),
            invoiceDate: new Date('2026-01-05'),
            invoiceNumber: 'SPOT-2026-01',
            fileUrl: '/uploads/demo-user-uuid-1234/spotify-jan-2026.pdf',
            needsReview: false,
        },
        {
            vendorId: createdVendors[2].id,
            name: 'Office Supplies - Stationery',
            originalAmount: 85.5,
            originalCurrency: 'EUR',
            normalizedAmount: 92.82,
            fxRate: 1.0856,
            fxDate: new Date('2025-11-15'),
            invoiceDate: new Date('2025-11-15'),
            invoiceNumber: 'OSC-2025-1115',
            fileUrl: '/uploads/demo-user-uuid-1234/office-nov-2025.pdf',
            needsReview: false,
        },
        {
            vendorId: createdVendors[2].id,
            name: 'Office Supplies - Printer Paper',
            originalAmount: 150.0,
            originalCurrency: 'EUR',
            normalizedAmount: 162.84,
            fxRate: 1.0856,
            fxDate: new Date('2025-12-20'),
            invoiceDate: new Date('2025-12-20'),
            invoiceNumber: 'OSC-2025-1220',
            fileUrl: '/uploads/demo-user-uuid-1234/office-dec-2025.pdf',
            needsReview: false,
        },
        {
            vendorId: createdVendors[2].id,
            name: 'Office Supplies - Large Order',
            originalAmount: 2500.0,
            originalCurrency: 'EUR',
            normalizedAmount: 2714.0,
            fxRate: 1.0856,
            fxDate: new Date('2026-01-10'),
            invoiceDate: new Date('2026-01-10'),
            invoiceNumber: 'OSC-2026-0110',
            fileUrl: '/uploads/demo-user-uuid-1234/office-jan-2026.pdf',
            needsReview: true,
        },
        {
            vendorId: createdVendors[3].id,
            name: 'Coffee & Pastries',
            originalAmount: 45.0,
            originalCurrency: 'ILS',
            normalizedAmount: 12.33,
            fxRate: 0.274,
            fxDate: new Date('2025-12-10'),
            invoiceDate: new Date('2025-12-10'),
            invoiceNumber: null,
            fileUrl: '/uploads/demo-user-uuid-1234/coffee-dec-2025.pdf',
            needsReview: false,
        },
        {
            vendorId: createdVendors[3].id,
            name: 'Coffee & Pastries',
            originalAmount: 38.5,
            originalCurrency: 'ILS',
            normalizedAmount: 10.55,
            fxRate: 0.274,
            fxDate: new Date('2025-12-15'),
            invoiceDate: new Date('2025-12-15'),
            invoiceNumber: null,
            fileUrl: '/uploads/demo-user-uuid-1234/coffee-dec2-2025.pdf',
            needsReview: false,
        },
        {
            vendorId: createdVendors[3].id,
            name: 'Coffee & Pastries',
            originalAmount: 52.0,
            originalCurrency: 'ILS',
            normalizedAmount: 14.25,
            fxRate: 0.274,
            fxDate: new Date('2026-01-08'),
            invoiceDate: new Date('2026-01-08'),
            invoiceNumber: null,
            fileUrl: '/uploads/demo-user-uuid-1234/coffee-jan-2026.pdf',
            needsReview: false,
        },
        {
            vendorId: createdVendors[4].id,
            name: 'Internet Service - November',
            originalAmount: 89.99,
            originalCurrency: 'USD',
            normalizedAmount: 89.99,
            fxRate: 1.0,
            fxDate: new Date('2025-11-01'),
            invoiceDate: new Date('2025-11-01'),
            invoiceNumber: 'ISP-2025-11',
            fileUrl: '/uploads/demo-user-uuid-1234/internet-nov-2025.pdf',
            needsReview: false,
        },
        {
            vendorId: createdVendors[4].id,
            name: 'Internet Service - December',
            originalAmount: 89.99,
            originalCurrency: 'USD',
            normalizedAmount: 89.99,
            fxRate: 1.0,
            fxDate: new Date('2025-12-01'),
            invoiceDate: new Date('2025-12-01'),
            invoiceNumber: 'ISP-2025-12',
            fileUrl: '/uploads/demo-user-uuid-1234/internet-dec-2025.pdf',
            needsReview: false,
        },
        {
            vendorId: createdVendors[4].id,
            name: 'Internet Service - January',
            originalAmount: 89.99,
            originalCurrency: 'USD',
            normalizedAmount: 89.99,
            fxRate: 1.0,
            fxDate: new Date('2026-01-01'),
            invoiceDate: new Date('2026-01-01'),
            invoiceNumber: 'ISP-2026-01',
            fileUrl: '/uploads/demo-user-uuid-1234/internet-jan-2026.pdf',
            needsReview: false,
        },
        {
            vendorId: createdVendors[0].id,
            name: 'AWS Cloud Services - November',
            originalAmount: 425.0,
            originalCurrency: 'USD',
            normalizedAmount: 425.0,
            fxRate: 1.0,
            fxDate: new Date('2025-11-01'),
            invoiceDate: new Date('2025-11-01'),
            invoiceNumber: 'AWS-2025-11-001',
            fileUrl: '/uploads/demo-user-uuid-1234/aws-nov-2025.pdf',
            needsReview: false,
        },
        {
            vendorId: createdVendors[1].id,
            name: 'Spotify Premium - November',
            originalAmount: 9.99,
            originalCurrency: 'USD',
            normalizedAmount: 9.99,
            fxRate: 1.0,
            fxDate: new Date('2025-11-05'),
            invoiceDate: new Date('2025-11-05'),
            invoiceNumber: 'SPOT-2025-11',
            fileUrl: '/uploads/demo-user-uuid-1234/spotify-nov-2025.pdf',
            needsReview: false,
        },
        {
            vendorId: createdVendors[3].id,
            name: 'Coffee & Pastries',
            originalAmount: 45.0,
            originalCurrency: 'ILS',
            normalizedAmount: 12.33,
            fxRate: 0.274,
            fxDate: new Date('2025-11-20'),
            invoiceDate: new Date('2025-11-20'),
            invoiceNumber: null,
            fileUrl: '/uploads/demo-user-uuid-1234/coffee-nov-2025.pdf',
            needsReview: false,
        },
        {
            vendorId: createdVendors[2].id,
            name: 'Office Supplies - Printer Paper (Duplicate)',
            originalAmount: 150.0,
            originalCurrency: 'EUR',
            normalizedAmount: 162.84,
            fxRate: 1.0856,
            fxDate: new Date('2025-12-20'),
            invoiceDate: new Date('2025-12-20'),
            invoiceNumber: 'OSC-2025-1220-DUP',
            fileUrl: '/uploads/demo-user-uuid-1234/office-dec-2025-dup.pdf',
            needsReview: true,
        },
    ];
    for (const invoiceData of invoices) {
        const invoice = await prisma.invoice.create({
            data: {
                tenantId: demoUser.id,
                ...invoiceData,
            },
        });
        console.log(`✅ Created invoice: ${invoice.name || invoice.invoiceNumber}`);
    }
    const sampleInvoice = await prisma.invoice.findFirst({
        where: { tenantId: demoUser.id },
    });
    if (sampleInvoice) {
        await prisma.extractionRun.create({
            data: {
                tenantId: demoUser.id,
                invoiceId: sampleInvoice.id,
                status: 'SUCCESS',
                ocrText: 'Sample OCR text from invoice...',
                llmResponse: {
                    vendorName: 'AWS',
                    totalAmount: 450.0,
                    currency: 'USD',
                    invoiceDate: '2025-12-01',
                    confidence: {
                        vendorName: 0.95,
                        totalAmount: 0.98,
                        currency: 1.0,
                        invoiceDate: 0.92,
                    },
                    warnings: [],
                },
                processingTimeMs: 2500,
            },
        });
        console.log('✅ Created sample extraction run');
    }
    console.log('🎉 Database seed completed successfully!');
}
main()
    .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map