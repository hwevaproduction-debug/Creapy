// React Imports
import { useState } from "react";
import { useNavigate } from "react-router-dom";
// MUI Imports
import { Box, FormControlLabel, Radio, RadioGroup } from "@mui/material";
import { Eye, EyeOff } from "lucide-react";
// Formik Imports
import { Form, Formik, FormikProps } from "formik";
// Utils Imports
import { onKeyDown } from "../../utils";
// Redux Imports
import {
  useResendVerificationMutation,
  useSignupMutation,
} from "../../redux/api/authApiSlice";
// Components Imports
import DotLoader from "../../components/Spinner/dotLoader";
import PrimaryInput from "../../components/PrimaryInput/PrimaryInput";
import ToastAlert from "../../components/ToastAlert/ToastAlert";
import { signUpSchema } from "./components/validationSchema";
import { Heading, SubHeading } from "../../components/Heading";
// Google OAuth Imports
import GoogleOAuth from "../../components/OAuth";
import AppCard from "../../components/ui/AppCard";
import AppButton from "../../components/ui/AppButton";
import HeroSlideshow from "../../views/Home/HeroSlideshow";

const FALLBACK_HERO_IMAGES = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1920&q=80",
];

interface ISSignUpForm {
  userName: string;
  email: string;
  password: string;
  role: "tenant" | "landlord";
}

const signUpFormSchema = signUpSchema.omit(["phoneNumber", "nationalId"] as any);

const SignUp = () => {
  const navigate = useNavigate();

  // states
  const [showPassword, setShowPassword] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [formValues, setFormValues] = useState<ISSignUpForm>({
    userName: "",
    email: "",
    password: "",
    role: "tenant",
  });

  const [toast, setToast] = useState({
    message: "",
    appearence: false,
    type: "",
  });

  const hideShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleCloseToast = () => {
    setToast({ ...toast, appearence: false });
  };

  // Sign Up Api Bind
  const [signupUser, { isLoading }] = useSignupMutation();
  const [resendVerification, { isLoading: isResendingVerification }] =
    useResendVerificationMutation();

  const SignUpHandler = async (data: ISSignUpForm) => {
    if (!["tenant", "landlord"].includes(data.role)) {
      setToast({
        ...toast,
        message: "Role must be tenant or landlord",
        appearence: true,
        type: "error",
      });
      return;
    }

    const payload = {
      username: data.userName,
      email: data.email,
      password: data.password,
      role: data.role,
    };
    try {
      const user: any = await signupUser(payload);

      if (user?.data?.status === "pending_verification") {
        setPendingVerificationEmail(data.email);
        return;
      }

      if (user?.data?.status) {
        setToast({
          ...toast,
          message: user?.data?.message || "Account created",
          appearence: true,
          type: "success",
        });
      }
      if (user?.error) {
        setToast({
          ...toast,
          message: user?.error?.data?.message,
          appearence: true,
          type: "error",
        });
      }
    } catch (error) {
      console.error("SignUp Error:", error);
      setToast({
        ...toast,
        message: "Something went wrong",
        appearence: true,
        type: "error",
      });
    }
  };

  const handleResendVerification = async () => {
    try {
      await resendVerification({ email: pendingVerificationEmail }).unwrap();
      setToast({
        ...toast,
        message: "Verification email resent.",
        appearence: true,
        type: "success",
      });
    } catch (error: any) {
      setToast({
        ...toast,
        message:
          error?.data?.message ||
          error?.message ||
          "Unable to resend verification email.",
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
      <AppCard
        sx={{
          width: { xs: "calc(100% - 32px)", sm: "480px", md: "min(560px, 33vw)" },
          maxHeight: "calc(100vh - 64px)",
          overflowY: "auto",
          p: { xs: 3, md: "52px 52px" },
          borderRadius: "28px",
          boxShadow:
            "0 40px 100px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)",
          backdropFilter: "blur(24px)",
          position: "relative",
          zIndex: 2,
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
              {pendingVerificationEmail ? (
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
                    We sent a verification link to {pendingVerificationEmail}. Verify
                    your email before logging in.
                  </SubHeading>
                  <AppButton
                    sx={{ mt: 1 }}
                    disabled={isResendingVerification}
                    loading={isResendingVerification}
                    onClick={handleResendVerification}
                  >
                    Resend email
                  </AppButton>
                  <AppButton variant="text" onClick={() => navigate("/login")}>
                    Go to Login
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
                      Create your account
                    </Heading>
                    <SubHeading sx={{ color: "text.secondary" }}>
                      Join to save listings and manage your profile.
                    </SubHeading>
                  </Box>
                  <Box sx={{ width: "100%", marginTop: "10px" }}>
              <Formik
                initialValues={formValues}
                validate={(values: ISSignUpForm) => {
                  const validationErrors: Partial<
                    Record<keyof ISSignUpForm, string>
                  > = {};
                  if (!["tenant", "landlord"].includes(values.role)) {
                    validationErrors.role = "Role must be tenant or landlord";
                  }
                  return validationErrors;
                }}
                onSubmit={(values: ISSignUpForm) => {
                  SignUpHandler(values);
                }}
                validationSchema={signUpFormSchema}
              >
                {(props: FormikProps<ISSignUpForm>) => {
                  const { values, touched, errors, handleBlur, handleChange } =
                    props;

                  return (
                    <Form onKeyDown={onKeyDown}>
                      <Box sx={{ marginTop: "20px" }}>
                        <SubHeading sx={{ marginBottom: "5px" }}>
                          User Name
                        </SubHeading>
                        <PrimaryInput
                          type="text"
                          label=""
                          name="userName"
                          placeholder="User Name"
                          value={values.userName}
                          helperText={
                            errors.userName && touched.userName
                              ? errors.userName
                              : ""
                          }
                          error={
                            errors.userName && touched.userName ? true : false
                          }
                          onChange={handleChange}
                          onBlur={handleBlur}
                        />
                      </Box>
                      <Box sx={{ marginTop: "12px" }}>
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
                            errors.email && touched.email ? errors.email : ""
                          }
                          error={errors.email && touched.email ? true : false}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        />
                      </Box>
                      <Box sx={{ marginTop: "12px" }}>
                        <SubHeading sx={{ marginBottom: "5px" }}>
                          Password
                        </SubHeading>
                        <PrimaryInput
                          type={showPassword ? "text" : "password"}
                          label=""
                          name="password"
                          placeholder="Password"
                          value={values.password}
                          helperText={
                            errors.password && touched.password
                              ? errors.password
                              : ""
                          }
                          error={
                            errors.password && touched.password ? true : false
                          }
                          onChange={handleChange}
                          onBlur={handleBlur}
                          onClick={hideShowPassword}
                          endAdornment={
                            showPassword ? (
                              <Eye color="disabled" />
                            ) : (
                              <EyeOff color="disabled" />
                            )
                          }
                        />
                      </Box>
                      <Box sx={{ marginTop: "12px" }}>
                        <SubHeading sx={{ marginBottom: "5px" }}>
                          I am a:
                        </SubHeading>
                        <RadioGroup
                          name="role"
                          value={values.role}
                          onChange={handleChange}
                          row
                        >
                          <FormControlLabel
                            value="tenant"
                            control={<Radio />}
                            label="Tenant"
                          />
                          <FormControlLabel
                            value="landlord"
                            control={<Radio />}
                            label="Landlord"
                          />
                        </RadioGroup>
                        {errors.role && touched.role && (
                          <Box sx={{ fontSize: "12px", color: "#d32f2f" }}>
                            {errors.role}
                          </Box>
                        )}
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
                          size="large"
                          disabled={isLoading}
                          sx={{ margin: "0 0 16px 0" }}
                        >
                          {isLoading ? (
                            <DotLoader color="#fff" size={12} />
                          ) : (
                            "Sign Up"
                          )}
                        </AppButton>
                      </Box>
                      <Box
                        sx={{
                          "& .MuiButton-root": {
                            background: "var(--surface-card)",
                            color: "var(--text-primary)",
                            border: "1.5px solid var(--border-default)",
                            borderRadius: "999px",
                            lineHeight: 1.2,
                            "&:hover": {
                              background: "var(--surface-page)",
                            },
                          },
                        }}
                      >
                        <GoogleOAuth />
                      </Box>
                      <Box
                        sx={{
                          margin: "0 0 10px 0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 1,
                        }}
                      >
                        Already have an account?
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
                          Login
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
      <ToastAlert
        appearence={toast.appearence}
        type={toast.type}
        message={toast.message}
        handleClose={handleCloseToast}
      />
    </Box>
  );
};

export default SignUp;
