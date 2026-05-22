// React Imports
import { useState } from "react";
import { useNavigate } from "react-router-dom";
// MUI Imports
import { Box, Grid } from "@mui/material";
// Formik Imports
import { Form, Formik, FormikProps } from "formik";
import * as Yup from "yup";
// Utils Imports
import { onKeyDown } from "../../utils";
// Components Imports
import { Heading, SubHeading } from "../../components/Heading";
import DotLoader from "../../components/Spinner/dotLoader";
import PrimaryInput from "../../components/PrimaryInput/PrimaryInput";
import ToastAlert from "../../components/ToastAlert/ToastAlert";
import AppContainer from "../../components/ui/AppContainer";
import AppCard from "../../components/ui/AppCard";
import AppButton from "../../components/ui/AppButton";
import HeroSlideshow from "../../views/Home/HeroSlideshow";
import { useForgotPasswordMutation } from "../../redux/api/authApiSlice";

const FALLBACK_HERO_IMAGES = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1920&q=80",
];

interface ISForgotPasswordForm {
  email: string;
}

const forgotPasswordSchema = Yup.object().shape({
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required")
    .nullable(),
});

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [sentResetEmail, setSentResetEmail] = useState("");
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const [formValues] = useState<ISForgotPasswordForm>({
    email: "",
  });

  const [toast, setToast] = useState({
    message: "",
    appearence: false,
    type: "",
  });

  const handleCloseToast = () => {
    setToast({ ...toast, appearence: false });
  };

  const forgotPasswordHandler = async (data: ISForgotPasswordForm) => {
    try {
      await forgotPassword({ email: data.email }).unwrap();
      setSentResetEmail(data.email);
    } catch (error: any) {
      setToast({
        ...toast,
        message:
          error?.data?.message ||
          error?.message ||
          "Unable to send a password reset email. Please try again.",
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
        <Grid container spacing={2} justifyContent="center">
          <Grid item xs={12} md={6} lg={5}>
            <AppCard
              sx={{
                maxWidth: 460,
                mx: "auto",
                p: { xs: 2.5, md: 3.5 },
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
              {sentResetEmail ? (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    flexDirection: "column",
                    textAlign: "center",
                    py: 2,
                    gap: 1.5,
                  }}
                >
                  <Heading sx={{ fontSize: "32px", marginBottom: "6px" }}>
                    Check your email
                  </Heading>
                  <SubHeading sx={{ color: "text.secondary", maxWidth: 360 }}>
                    We sent a password reset link to {sentResetEmail}. Follow
                    the instructions in that email to reset your password.
                  </SubHeading>
                  <AppButton sx={{ mt: 1 }} onClick={() => navigate("/login")}>
                    Back to Login
                  </AppButton>
                </Box>
              ) : (
                <>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      flexDirection: "column",
                      textAlign: "center",
                    }}
                  >
                    <Heading sx={{ fontSize: "32px", marginBottom: "6px" }}>
                      Forgot password
                    </Heading>
                    <SubHeading sx={{ color: "text.secondary" }}>
                      Enter your email and we will send reset instructions.
                    </SubHeading>
                  </Box>
                  <Box sx={{ width: "100%", marginTop: "10px" }}>
                    <Formik
                      initialValues={formValues}
                      onSubmit={(values: ISForgotPasswordForm) => {
                        forgotPasswordHandler(values);
                      }}
                      validationSchema={forgotPasswordSchema}
                    >
                      {(props: FormikProps<ISForgotPasswordForm>) => {
                        const {
                          values,
                          touched,
                          errors,
                          handleBlur,
                          handleChange,
                        } = props;

                        return (
                          <Form onKeyDown={onKeyDown}>
                            <Box sx={{ marginTop: "20px" }}>
                              <SubHeading sx={{ marginBottom: "5px" }}>
                                Email
                              </SubHeading>
                              <PrimaryInput
                                type="text"
                                label=""
                                name="email"
                                placeholder="Email"
                                value={values.email}
                                helperText={
                                  errors.email && touched.email
                                    ? errors.email
                                    : ""
                                }
                                error={
                                  errors.email && touched.email ? true : false
                                }
                                onChange={handleChange}
                                onBlur={handleBlur}
                              />
                            </Box>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "end",
                                marginTop: "16px",
                              }}
                            >
                              <AppButton
                                type="submit"
                                fullWidth
                                disabled={isLoading}
                                sx={{ margin: "0 0 16px 0" }}
                              >
                                {isLoading ? (
                                  <DotLoader color="#fff" size={12} />
                                ) : (
                                  "Send Reset Link"
                                )}
                              </AppButton>
                            </Box>
                            <Box
                              sx={{
                                margin: "0 0 10px 0",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Box
                                sx={{
                                  color: "#1F4D3A",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  "&:hover": {
                                    textDecoration: "underline",
                                  },
                                }}
                                onClick={() => {
                                  navigate("/login");
                                }}
                              >
                                Back to Login
                              </Box>
                            </Box>
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

export default ForgotPassword;
