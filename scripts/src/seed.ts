import { db } from "@workspace/db";
import {
  branchesTable,
  usersTable,
  medicinesTable,
  batchesTable,
  patientsTable,
  suppliersTable,
  prescriptionsTable,
} from "@workspace/db";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  // Upsert branches
  await db.insert(branchesTable).values({
    name: "Main Dispensary",
    code: "MAIN",
    address: "123 Hospital Road, Lahore",
    phone: "042-35761234",
    licenseNumber: "DL-2024-001",
    taxRate: "0.17",
    mrpEnforcement: true,
  }).onConflictDoNothing();

  await db.insert(branchesTable).values({
    name: "Gulberg Branch",
    code: "GLB",
    address: "45 Gulberg Main Blvd, Lahore",
    phone: "042-35880099",
    licenseNumber: "DL-2024-002",
    taxRate: "0.17",
    mrpEnforcement: true,
  }).onConflictDoNothing();

  const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.code, "MAIN"));
  const [branch2] = await db.select().from(branchesTable).where(eq(branchesTable.code, "GLB"));

  const hash = await bcrypt.hash("admin123", 12);
  const cashierHash = await bcrypt.hash("cashier123", 12);

  const [admin] = await db.insert(usersTable).values({
    name: "Dr. Admin User",
    email: "admin@rxpos.pk",
    passwordHash: hash,
    role: "admin",
    branchId: branch.id,
    phone: "0321-4567890",
    permissions: ["all"],
  }).returning();

  await db.insert(usersTable).values({
    name: "Sarah Khan",
    email: "cashier@rxpos.pk",
    passwordHash: cashierHash,
    role: "cashier",
    branchId: branch.id,
    phone: "0322-1234567",
    permissions: ["sales.create", "patients.view"],
  });

  await db.insert(usersTable).values({
    name: "Ali Hassan",
    email: "pharmacist@rxpos.pk",
    passwordHash: cashierHash,
    role: "pharmacist",
    branchId: branch.id,
    phone: "0333-9876543",
    permissions: ["prescriptions.verify", "prescriptions.dispense", "inventory.adjust"],
  });

  const medicines = await db.insert(medicinesTable).values([
    {
      name: "Paracetamol 500mg",
      genericName: "Paracetamol",
      brand: "Panadol",
      category: "Analgesics",
      manufacturer: "GSK Pakistan",
      strength: "500mg",
      form: "Tablet",
      unit: "Tab",
      packSize: 20,
      mrp: "45.00",
      requiresPrescription: false,
      isEssentialMedicine: true,
      minStockLevel: 50,
      reorderPoint: 100,
      barcode: "6009875021001",
    },
    {
      name: "Amoxicillin 500mg",
      genericName: "Amoxicillin",
      brand: "Amoxil",
      category: "Antibiotics",
      manufacturer: "GSK Pakistan",
      strength: "500mg",
      form: "Capsule",
      unit: "Cap",
      packSize: 14,
      mrp: "185.00",
      requiresPrescription: true,
      isEssentialMedicine: true,
      minStockLevel: 20,
      reorderPoint: 40,
      barcode: "6009875021002",
    },
    {
      name: "Metformin 500mg",
      genericName: "Metformin HCl",
      brand: "Glucophage",
      category: "Antidiabetics",
      manufacturer: "Merck Pakistan",
      strength: "500mg",
      form: "Tablet",
      unit: "Tab",
      packSize: 30,
      mrp: "320.00",
      requiresPrescription: true,
      isEssentialMedicine: true,
      minStockLevel: 30,
      reorderPoint: 60,
    },
    {
      name: "Omeprazole 20mg",
      genericName: "Omeprazole",
      brand: "Losec",
      category: "GI Drugs",
      manufacturer: "AstraZeneca",
      strength: "20mg",
      form: "Capsule",
      unit: "Cap",
      packSize: 14,
      mrp: "155.00",
      requiresPrescription: false,
      minStockLevel: 25,
      reorderPoint: 50,
    },
    {
      name: "Amlodipine 5mg",
      genericName: "Amlodipine",
      brand: "Norvasc",
      category: "Cardiovascular",
      manufacturer: "Pfizer Pakistan",
      strength: "5mg",
      form: "Tablet",
      unit: "Tab",
      packSize: 30,
      mrp: "285.00",
      requiresPrescription: true,
      minStockLevel: 20,
      reorderPoint: 40,
    },
    {
      name: "Cetirizine 10mg",
      genericName: "Cetirizine HCl",
      brand: "Zyrtec",
      category: "Antihistamines",
      manufacturer: "UCB",
      strength: "10mg",
      form: "Tablet",
      unit: "Tab",
      packSize: 10,
      mrp: "120.00",
      requiresPrescription: false,
      minStockLevel: 40,
      reorderPoint: 80,
    },
    {
      name: "Ibuprofen 400mg",
      genericName: "Ibuprofen",
      brand: "Brufen",
      category: "NSAIDs",
      manufacturer: "Abbott Pakistan",
      strength: "400mg",
      form: "Tablet",
      unit: "Tab",
      packSize: 20,
      mrp: "95.00",
      requiresPrescription: false,
      isEssentialMedicine: true,
      minStockLevel: 40,
      reorderPoint: 80,
    },
    {
      name: "Atorvastatin 20mg",
      genericName: "Atorvastatin",
      brand: "Lipitor",
      category: "Cardiovascular",
      manufacturer: "Pfizer Pakistan",
      strength: "20mg",
      form: "Tablet",
      unit: "Tab",
      packSize: 30,
      mrp: "450.00",
      requiresPrescription: true,
      minStockLevel: 15,
      reorderPoint: 30,
    },
    {
      name: "Azithromycin 500mg",
      genericName: "Azithromycin",
      brand: "Zithromax",
      category: "Antibiotics",
      manufacturer: "Pfizer Pakistan",
      strength: "500mg",
      form: "Tablet",
      unit: "Tab",
      packSize: 3,
      mrp: "380.00",
      requiresPrescription: true,
      minStockLevel: 10,
      reorderPoint: 20,
    },
    {
      name: "Salbutamol Inhaler",
      genericName: "Salbutamol",
      brand: "Ventolin",
      category: "Respiratory",
      manufacturer: "GSK Pakistan",
      strength: "100mcg",
      form: "Inhaler",
      unit: "Pcs",
      packSize: 1,
      mrp: "320.00",
      requiresPrescription: true,
      minStockLevel: 10,
      reorderPoint: 20,
    },
  ]).returning();

  const today = new Date().toISOString().split("T")[0];
  const future1 = new Date();
  future1.setFullYear(future1.getFullYear() + 1);
  const future1Str = future1.toISOString().split("T")[0];
  const future2 = new Date();
  future2.setFullYear(future2.getFullYear() + 2);
  const future2Str = future2.toISOString().split("T")[0];
  const expiring = new Date();
  expiring.setDate(expiring.getDate() + 45);
  const expiringStr = expiring.toISOString().split("T")[0];

  for (let i = 0; i < medicines.length; i++) {
    const med = medicines[i];
    await db.insert(batchesTable).values({
      medicineId: med.id,
      branchId: branch.id,
      batchNumber: `BT-${String(i + 1).padStart(4, "0")}-A`,
      expiryDate: i % 3 === 0 ? expiringStr : i % 2 === 0 ? future1Str : future2Str,
      quantity: Math.floor(Math.random() * 150) + 20,
      purchasePrice: String((Number(med.mrp) * 0.65).toFixed(2)),
      sellingPrice: med.mrp,
    });
  }

  const [supplier] = await db.insert(suppliersTable).values({
    name: "MediPharma Distributors",
    contactPerson: "Tariq Mehmood",
    phone: "0300-4581234",
    email: "tariq@medipharma.pk",
    address: "Hafeez Centre, Lahore",
    licenseNumber: "WDL-2024-045",
    creditDays: 30,
    paymentTerms: "Net 30",
  }).returning();

  await db.insert(suppliersTable).values({
    name: "National Health Supplies",
    contactPerson: "Rashida Bibi",
    phone: "0321-9078654",
    email: "rashida@nhs.pk",
    address: "Shadman, Lahore",
    creditDays: 45,
    paymentTerms: "Net 45",
  });

  const [patient1] = await db.insert(patientsTable).values({
    name: "Muhammad Imran",
    phone: "0345-6789012",
    cnic: "35202-1234567-1",
    gender: "Male",
    dob: "1975-03-15",
    address: "DHA Phase 5, Lahore",
    allergies: ["Penicillin", "Sulfa"],
    chronicConditions: ["Hypertension", "Type 2 Diabetes"],
    chronicMedications: ["Metformin 500mg", "Amlodipine 5mg"],
    customerType: "retail",
    bloodGroup: "B+",
  }).returning();

  const [patient2] = await db.insert(patientsTable).values({
    name: "Fatima Malik",
    phone: "0333-2345678",
    cnic: "35202-7654321-0",
    gender: "Female",
    dob: "1990-07-22",
    address: "Gulberg III, Lahore",
    allergies: [],
    chronicConditions: ["Asthma"],
    chronicMedications: ["Salbutamol Inhaler"],
    customerType: "retail",
    bloodGroup: "A+",
  }).returning();

  await db.insert(patientsTable).values({
    name: "Ahmed Raza",
    phone: "0312-8765432",
    mrn: "MRN-2024-001",
    ward: "Cardiology",
    gender: "Male",
    dob: "1960-11-08",
    allergies: ["Aspirin"],
    chronicConditions: ["Coronary Artery Disease"],
    chronicMedications: ["Atorvastatin 20mg"],
    customerType: "hospital",
    bloodGroup: "O+",
  });

  await db.insert(prescriptionsTable).values([
    {
      patientId: patient1.id,
      prescriberName: "Dr. Khalid Mahmood",
      prescriberLicense: "PMDC-12345",
      prescriptionDate: today,
      status: "received",
      source: "manual",
      items: [
        { medicine_name: "Metformin 500mg", dose: "500mg", frequency: "BD", duration: "30 days", quantity: 60 },
        { medicine_name: "Amlodipine 5mg", dose: "5mg", frequency: "OD", duration: "30 days", quantity: 30 },
      ],
      branchId: branch.id,
      notes: "Patient on long-term diabetes management",
    },
    {
      patientId: patient2.id,
      prescriberName: "Dr. Sana Mirza",
      prescriberLicense: "PMDC-67890",
      prescriptionDate: today,
      status: "verified",
      source: "manual",
      items: [
        { medicine_name: "Salbutamol Inhaler", dose: "100mcg", frequency: "PRN", duration: "60 days", quantity: 2 },
        { medicine_name: "Cetirizine 10mg", dose: "10mg", frequency: "OD", duration: "7 days", quantity: 7 },
      ],
      branchId: branch.id,
      notes: "Seasonal allergic asthma exacerbation",
    },
  ]);

  console.log("Seeding complete!");
  console.log("Login credentials:");
  console.log("  Admin:      admin@rxpos.pk / admin123");
  console.log("  Cashier:    cashier@rxpos.pk / cashier123");
  console.log("  Pharmacist: pharmacist@rxpos.pk / cashier123");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
