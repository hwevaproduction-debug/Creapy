import LegalPageLayout from "../../components/LegalPageLayout";

const sections = [
  { id: "values", title: "Our Values", content: "Town Ruins is built for direct, respectful property discovery. Accuracy, fairness, safety, and accountability are expected from tenants, landlords, hosts, and providers." },
  { id: "communication", title: "Respectful Communication", content: "Messages should be clear, honest, and courteous. Do not pressure users, insult them, share private information, or continue contact after someone asks you to stop." },
  { id: "prohibited", title: "Prohibited Behavior", content: "Threats, scams, discrimination, fake documents, fake listings, spam, harassment, and illegal activity are not allowed on Town Ruins." },
  { id: "reporting", title: "Reporting Violations", content: "Users should report suspicious listings, unsafe behavior, or policy violations to support@townruins.com with relevant screenshots, links, and account details." },
  { id: "consequences", title: "Consequences", content: "Violations may result in warnings, content removal, feature restrictions, account suspension, permanent termination, or referral to relevant authorities." },
  { id: "appeals", title: "Appeals", content: "Users may appeal enforcement decisions by contacting support with context, evidence, and the account email connected to the decision." },
];

export default function CommunityGuidelines() {
  return <LegalPageLayout title="Community Guidelines" lastUpdated="May 2026" sections={sections} />;
}
