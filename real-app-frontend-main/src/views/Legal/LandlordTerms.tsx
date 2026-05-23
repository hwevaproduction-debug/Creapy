import LegalPageLayout from "../../components/LegalPageLayout";

const sections = [
  { id: "eligibility", title: "Eligibility", content: "Landlords and hosts must be legally entitled to list the property and must provide valid identification, contact details, and ownership or authority information when requested." },
  { id: "listings", title: "Listing Requirements", content: "Each listing must be accurate, current, and specific about rent, deposits, utilities, rules, amenities, and availability. Misleading descriptions or unrelated photos may lead to removal." },
  { id: "verification", title: "Verification Process", content: "Town Ruins may require identity documents, selfies, ownership evidence, phone verification, or other checks before listings become visible or before premium features are enabled." },
  { id: "fees", title: "Fees & Commission", content: "Landlords are responsible for listed platform fees, token charges, commissions, and payment processing costs shown before purchase or activation." },
  { id: "responsibilities", title: "Landlord Responsibilities", content: "Landlords must respond honestly, respect tenant privacy, honor confirmed terms, maintain safe premises, and comply with Zimbabwe housing, tax, and consumer protection obligations." },
  { id: "prohibited", title: "Prohibited Conduct", content: "Fake listings, duplicate spam, bait pricing, discrimination, harassment, off-platform scams, and requests for unlawful payments are prohibited." },
  { id: "termination", title: "Termination", content: "Town Ruins may suspend listings or landlord accounts for policy breaches, unresolved complaints, fraudulent activity, or failed verification." },
  { id: "law", title: "Governing Law", content: "This agreement is governed by Zimbabwe law and forms part of the wider Town Ruins Terms of Use." },
];

export default function LandlordTerms() {
  return <LegalPageLayout title="Host & Landlord Agreement" lastUpdated="May 2026" sections={sections} />;
}
