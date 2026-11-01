import { withTransaction } from '../../db/pool';
import { notFound } from '../../lib/http';
import { findCustomerByPhone, insertCustomer } from '../customers/customers.repo';
import { vehicleExists } from '../vehicles/vehicles.repo';
import { insertLead, lockLead, setLeadStatus, type LeadKind } from './leads.repo';

// Сайтаас ирсэн хүсэлт. Машины id буруу/байхгүй бол машингүй хадгална.
export async function createLead(input: {
  vehicle_id?: string;
  kind: LeadKind;
  name: string;
  phone: string;
  preferred_time: string | null;
  message: string | null;
}) {
  const vehicleId = input.vehicle_id && (await vehicleExists(input.vehicle_id)) ? input.vehicle_id : null;
  await insertLead({ ...input, vehicle_id: vehicleId });
}

// Хүсэлтийг үйлчлүүлэгч болгоно. Утсаар давхцвал байгаа үйлчлүүлэгчийг ашиглана.
// Шинэ хүсэлт бол "Холбогдсон" төлөвт шилжинэ.
export async function leadToCustomer(leadId: string) {
  return withTransaction(async (db) => {
    const lead = await lockLead(leadId, db);
    if (!lead) throw notFound('Хүсэлт олдсонгүй');
    let customer = await findCustomerByPhone(lead.phone, db);
    let created = false;
    if (!customer) {
      const note = [lead.preferred_time && `Хүссэн цаг: ${lead.preferred_time}`, lead.message]
        .filter(Boolean)
        .join('\n');
      customer = await insertCustomer({ name: lead.name, phone: lead.phone, note: note || null }, db);
      created = true;
    }
    if (lead.status === 'NEW') await setLeadStatus(lead.id, 'CONTACTED', db);
    return { customer, created };
  });
}
