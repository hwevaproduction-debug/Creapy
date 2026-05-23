// React Imports
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
// Material UI Imports
import { Box } from "@mui/material";
import { Eye, EyeOff } from "lucide-react";
// Formik Imports
import { Form, Formik, FormikProps } from "formik";
// Utils Imports
import { onKeyDown } from "../../utils";
// Redux Imports
import { useLoginMutation } from "../../redux/api/authApiSlice";
import { setUser } from "../../redux/auth/authSlice";
// Component Imports
import { Heading, SubHeading } from "../../components/Heading";
import DotLoader from "../../components/Spinner/dotLoader";
import { loginSchema } from "./components/validationSchema";
import PrimaryInput from "../../components/PrimaryInput/PrimaryInput";
import ToastAlert from "../../components/ToastAlert/ToastAlert";
// Google OAuth
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

interface ISLoginForm {
  email: string;
  password: string;
}

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // states
  const [showPassword, setShowPassword] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [formValues, setFormValues] = useState<ISLoginForm>({
    email: "",
    password: "",
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
  const [loginUser, { isLoading }] = useLoginMutation();

  const LoginHandler = async (data: ISLoginForm) => {
    const payload = {
      email: data.email,
      password: data.password,
    };
    try {
      const user: any = await loginUser(payload);

      if (user?.data?.status) {
        dispatch(setUser(user?.data));
        localStorage.setItem("user", JSON.stringify(user?.data));
        const from = (location.state as any)?.from;
        const openContact = (location.state as any)?.openContact;
        if (from && from !== "/login" && from !== "/signup") {
          navigate(from, {
            replace: true,
            state: openContact ? { openContact } : undefined,
          });
        } else {
          navigate("/", { replace: true });
        }
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
                  Welcome back
                </Heading>
                <SubHeading sx={{ color: "text.secondary" }}>
                  Log in to continue searching and saving listings.
                </SubHeading>
              </Box>
              <Box sx={{ width: "100%", marginTop: "10px" }}>
              <Formik
                initialValues={formValues}
                onSubmit={(values: ISLoginForm) => {
                  LoginHandler(values);
                }}
                validationSchema={loginSchema}
              >
                {(props: FormikProps<ISLoginForm>) => {
                  const { values, touched, errors, handleBlur, handleChange } =
                    props;

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
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "flex-end",
                          marginTop: "8px",
                        }}
                      >
                        <Box
                          sx={{
                            color: "#1F4D3A",
                            cursor: "pointer",
                            fontSize: "14px",
                            fontWeight: 600,
                            "&:hover": {
                              textDecoration: "underline",
                            },
                          }}
                          onClick={() => {
                            navigate("/forgot-password");
                          }}
                        >
                          Forgot password?
                        </Box>
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
                            "Login"
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
                        Don't Have an account?
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
                            navigate("/signup");
                          }}
                        >
                          Sign Up
                        </Box>
                      </Box>
                    </Form>
                  );
                }}
              </Formik>
              </Box>
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

export default Login;
