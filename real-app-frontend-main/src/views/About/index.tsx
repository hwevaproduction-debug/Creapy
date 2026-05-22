// MUI Imports
import { Box } from "@mui/material";
// Custom Imports
import { SubHeading } from "../../components/Heading";
import AppContainer from "../../components/ui/AppContainer";
import AppCard from "../../components/ui/AppCard";

const teamMembers = [
  {
    name: "Salman Muazam",
    role: "CEO",
    image:
      "https://firebasestorage.googleapis.com/v0/b/real-estate-54ca1.appspot.com/o/1701424117897salman%20passport.jpg?alt=media&token=a903aba6-b78e-4442-b0c0-f07c0dfa145f",
    alt: "Salman Muazam",
  },
  {
    name: "Hassan Raza",
    role: "President",
    image:
      "https://firebasestorage.googleapis.com/v0/b/real-estate-54ca1.appspot.com/o/1701198186809Hassan.jpg?alt=media&token=881f2f1b-b0d4-4933-9b4a-79259d313f42",
    alt: "Hassan Raza",
  },
  {
    name: "Ch Faizan",
    role: "Marketing Manager",
    image:
      "https://firebasestorage.googleapis.com/v0/b/real-estate-54ca1.appspot.com/o/1701198124445Faizan.jpg?alt=media&token=560ccfc3-f5f4-430c-b55d-d6a0357c7be2",
    alt: "Ch Faizan",
  },
];

const About = () => {
  return (
    <>
      <Box
        sx={{
          background: "linear-gradient(135deg, #1F2937 0%, #1F4D3A 100%)",
          pt: { xs: 12, md: 14 },
          pb: { xs: 6, md: 8 },
          textAlign: "center",
          px: 2,
        }}
      >
        <Box
          sx={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.15em",
            color: "#B8975A",
            textTransform: "uppercase",
            mb: 2,
          }}
        >
          About Us
        </Box>
        <Box
          component="h1"
          sx={{
            fontSize: { xs: "2rem", md: "3rem" },
            fontWeight: 800,
            color: "#fff",
            m: 0,
            mb: 2,
          }}
        >
          Zimbabwe's Premier Property Platform
        </Box>
        <Box
          sx={{
            fontSize: "1.1rem",
            color: "rgba(255,255,255,0.75)",
            maxWidth: 560,
            mx: "auto",
            lineHeight: 1.6,
          }}
        >
          Agent-free rental housing marketplace connecting tenants and
          landlords directly.
        </Box>
      </Box>
      <AppContainer sx={{ py: { xs: 6, md: 8 } }}>
        <AppCard sx={{ marginTop: "20px", p: { xs: 2, md: 3 } }}>
          <Box sx={{ color: "text.secondary", fontSize: "16px", lineHeight: 1.7 }}>
            This platform is an agent-free rental housing marketplace built to
            connect tenants and landlords directly &mdash; no middlemen, no
            inflated fees, no wasted time.
            <br />
            <br />
            In many rental markets, agents slow things down, reduce
            transparency, and increase costs for tenants while limiting
            landlords&rsquo; control over their own listings. This platform exists
            to remove that friction entirely by offering a simple, digital way
            to discover and list rental properties based on real, structured
            data.
            <br />
            <br />
            Tenants can browse public listings without creating an account,
            filter homes by location, price, rooms, and amenities, and view
            clear property details including room breakdowns and available
            features such as solar power, boreholes, security, parking, and
            internet availability.
            <br />
            <br />
            Landlords list and manage their properties directly, keeping full
            ownership of their listings while reaching tenants faster and more
            efficiently.
            <br />
            <br />
            The platform follows a landlord-paid publishing model. Basic access
            &mdash; browsing listings, viewing property details, and contacting
            landlords &mdash; is always free for everyone. Tenants never pay,
            while landlords subscribe only when they want to publish listings.
            <br />
            <br />
            Built as a mobile-first web application, the goal is speed, clarity,
            and trust &mdash; making it easier to find a home or rent one out
            without unnecessary intermediaries.
          </Box>
        </AppCard>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: 3,
            mt: 4,
          }}
        >
          {teamMembers.map((member) => (
            <AppCard
              key={member.name}
              sx={{ textAlign: "center", p: 3, width: { xs: "100%", sm: 220 } }}
            >
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  overflow: "hidden",
                  mx: "auto",
                  mb: 1.5,
                }}
              >
                <img
                  src={member.image}
                  alt={member.alt}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </Box>
              <SubHeading sx={{ mb: 0.5 }}>{member.name}</SubHeading>
              <Box
                sx={{
                  display: "inline-block",
                  background: "#F7EDDA",
                  color: "#7D6234",
                  borderRadius: "999px",
                  padding: "3px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                {member.role}
              </Box>
            </AppCard>
          ))}
        </Box>
      </AppContainer>
    </>
  );
};

export default About;
