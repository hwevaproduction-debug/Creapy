import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Chip, Grid } from "@mui/material";
import { CheckCircle2, Home } from "lucide-react";
import { Form, Formik, FormikProps } from "formik";
import * as Yup from "yup";
import { onKeyDown } from "../../utils";
import { useSubmitPropertyInterestMutation } from "../../redux/api/userApiSlice";
import DotLoader from "../../components/Spinner/dotLoader";
import PrimaryInput from "../../components/PrimaryInput/PrimaryInput";
import ToastAlert from "../../components/ToastAlert/ToastAlert";
import { Heading, SubHeading } from "../../components/Heading";
import AppContainer from "../../components/ui/AppContainer";
import AppCard from "../../components/ui/AppCard";
import AppButton from "../../components/ui/AppButton";
import AppSelect from "../../components/ui/AppSelect";
import HeroSlideshow from "../../views/Home/HeroSlideshow";

interface IPropertyInterestForm {
  fullName: string;
  email: string;
  phone: string;
  propertyType: string;
  location: string;
  description: string;
  referral: string;
}

const FALLBACK_HERO_IMAGES = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1920&q=80",
];

const initialValues: IPropertyInterestForm = {
  fullName: "",
  email: "",
  phone: "",
  propertyType: "",
  location: "",
  description: "",
  referral: "",
};

const propertyInterestSchema = Yup.object().shape({
  fullName: Yup.string().required("Full name is required"),
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
  phone: Yup.string().nullable(),
  propertyType: Yup.string().required("Property type is required"),
  location: Yup.string().required("Location is required"),
  description: Yup.string()
    .min(20, "Description must be at least 20 characters")
    .required("Description is required"),
  referral: Yup.string().nullable(),
});

const propertyTypeOptions = [
  { label: "House", value: "House" },
  { label: "Flat", value: "Flat" },
  { label: "Room", value: "Room" },
  { label: "Student Accommodation", value: "Student Accommodation" },
  { label: "Other", value: "Other" },
];

const trustSignals = ["Curated Listings", "Verified Tenants", "Dedicated Support"];

const ProviderSignUp = () => {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState({
    message: "",
    appearence: false,
    type: "",
  });

  const [submitPropertyInterest, { isLoading }] =
    useSubmitPropertyInterestMutation();

  const handleCloseToast = () => {
    setToast((prev) => ({ ...prev, appearence: false }));
  };

  const handleSubmit = async (data: IPropertyInterestForm) => {
    try {
      await submitPropertyInterest(data).unwrap();
      setSubmitted(true);
    } catch (error: any) {
      setToast({
        message:
          error?.data?.message ||
          error?.message ||
          "Unable to submit interest right now.",
        appearence: true,
        type: "error",
      });
    }
  };

  return (
    <Box
      sx={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 4,
        background: "#0F141E",
      }}
    >
      <HeroSlideshow images={FALLBACK_HERO_IMAGES} />
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: "rgba(15,20,30,0.55)",
          zIndex: 1,
        }}
      />
      <Box sx={{ position: "relative", zIndex: 2, width: "100%" }}>
        <AppContainer>
          <Grid container justifyContent="center">
            <Grid item xs={12}>
              <AppCard
                sx={{
                  maxWidth: 520,
                  mx: "auto",
                  p: { xs: 3, md: 4 },
                  borderRadius: "24px",
                  boxShadow: "0 32px 80px rgba(0,0,0,0.35)",
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
                  <Box
                    component="img"
                    src="/app-logo.png"
                    alt="Town Ruins"
                    sx={{
                      height: { xs: 32, md: 40 },
                      width: "auto",
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                </Box>
                {submitted ? (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      py: 2,
                      gap: 1.5,
                    }}
                  >
                    <CheckCircle2 size={58} color="#1F4D3A" />
                    <Heading sx={{ fontSize: "30px" }}>
                      Thank you for your interest!
                    </Heading>
                    <SubHeading sx={{ color: "text.secondary", maxWidth: 420 }}>
                      Our team will be in touch within 48 hours to guide you
                      through the listing process.
                    </SubHeading>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 1.5,
                        flexWrap: "wrap",
                        justifyContent: "center",
                        mt: 1,
                      }}
                    >
                      <AppButton onClick={() => navigate("/search")}>
                        Browse Listings
                      </AppButton>
                      <AppButton variant="outlined" onClick={() => navigate("/")}>
                        Back to Home
                      </AppButton>
                    </Box>
                  </Box>
                ) : (
                  <>
                    <Box sx={{ textAlign: "center" }}>
                      <Home size={34} color="#B8975A" />
                      <Heading sx={{ fontSize: "30px", mt: 1 }}>
                        List Your Property on Town Ruins
                      </Heading>
                      <SubHeading sx={{ color: "text.secondary", mt: 0.75 }}>
                        Join Zimbabwe's most curated property platform. We
                        personally review every listing.
                      </SubHeading>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 1,
                        flexWrap: "wrap",
                        justifyContent: "center",
                        mt: 2,
                      }}
                    >
                      {trustSignals.map((signal) => (
                        <Chip
                          key={signal}
                          label={signal}
                          size="small"
                          sx={{
                            background: "#F0F7F4",
                            color: "#1F4D3A",
                            fontWeight: 700,
                          }}
                        />
                      ))}
                    </Box>
                    <Box sx={{ width: "100%", mt: 2 }}>
                      <Formik
                        initialValues={initialValues}
                        onSubmit={handleSubmit}
                        validationSchema={propertyInterestSchema}
                      >
                        {(props: FormikProps<IPropertyInterestForm>) => {
                          const {
                            values,
                            touched,
                            errors,
                            handleBlur,
                            handleChange,
                          } = props;

                          return (
                            <Form onKeyDown={onKeyDown}>
                              <Box sx={{ display: "grid", gap: 1.5 }}>
                                <PrimaryInput
                                  label="Full name"
                                  name="fullName"
                                  placeholder="Full name"
                                  value={values.fullName}
                                  helperText={
                                    errors.fullName && touched.fullName
                                      ? errors.fullName
                                      : ""
                                  }
                                  error={Boolean(
                                    errors.fullName && touched.fullName
                                  )}
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                />
                                <PrimaryInput
                                  label="Email"
                                  name="email"
                                  placeholder="Email"
                                  value={values.email}
                                  helperText={
                                    errors.email && touched.email ? errors.email : ""
                                  }
                                  error={Boolean(errors.email && touched.email)}
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                />
                                <PrimaryInput
                                  label="Phone"
                                  name="phone"
                                  placeholder="+263 77 123 4567"
                                  value={values.phone}
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                />
                                <AppSelect
                                  label="Property type"
                                  name="propertyType"
                                  value={values.propertyType}
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                  options={propertyTypeOptions}
                                />
                                {errors.propertyType && touched.propertyType ? (
                                  <Box sx={{ color: "#d32f2f", fontSize: "12px" }}>
                                    {errors.propertyType}
                                  </Box>
                                ) : null}
                                <PrimaryInput
                                  label="Location"
                                  name="location"
                                  placeholder="Neighborhood or area"
                                  value={values.location}
                                  helperText={
                                    errors.location && touched.location
                                      ? errors.location
                                      : ""
                                  }
                                  error={Boolean(errors.location && touched.location)}
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                />
                                <PrimaryInput
                                  label="Description"
                                  name="description"
                                  placeholder="Tell us about the property"
                                  value={values.description}
                                  helperText={
                                    errors.description && touched.description
                                      ? errors.description
                                      : ""
                                  }
                                  error={Boolean(
                                    errors.description && touched.description
                                  )}
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                  multiline
                                  minRows={4}
                                  maxRows={6}
                                />
                                <PrimaryInput
                                  label="How did you hear about us?"
                                  name="referral"
                                  placeholder="Optional"
                                  value={values.referral}
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                />
                              </Box>
                              <AppButton
                                type="submit"
                                fullWidth
                                disabled={isLoading}
                                sx={{ mt: 2 }}
                              >
                                {isLoading ? (
                                  <DotLoader color="#fff" size={12} />
                                ) : (
                                  "Submit Interest"
                                )}
                              </AppButton>
                            </Form>
                          );
                        }}
                      </Formik>
                    </Box>
                  </>
                )}
              </AppCard>
            </Grid>
          </Grid>
        </AppContainer>
      </Box>
      <ToastAlert
        appearence={toast.appearence}
        type={toast.type}
        message={toast.message}
        handleClose={handleCloseToast}
      />
    </Box>
  );
};

export default ProviderSignUp;
