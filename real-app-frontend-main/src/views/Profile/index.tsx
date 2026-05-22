// React Imports
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
// Formik Imports
import { Form, Formik, FormikProps } from "formik";
// Component Imports
import { SubHeading } from "../../components/Heading";
import { signUpSchema } from "../SignUp/components/validationSchema";
import PrimaryInput from "../../components/PrimaryInput/PrimaryInput";
import ToastAlert from "../../components/ToastAlert/ToastAlert";
import DotLoader from "../../components/Spinner/dotLoader";
// Utils Imports
import { onKeyDown } from "../../utils";
import { getGreeting, getFirstName } from "../../utils/greeting";
// Hooks Imports
import useTypedSelector from "../../hooks/useTypedSelector";
import { Camera, Eye, EyeOff, Trash2 } from "lucide-react";
// Redux Imports
import { useDeleteMutation, useUpdateMutation } from "../../redux/api/userApiSlice";
import {
  useGetR2SignedUrlMutation,
  type R2SignedUrlData,
} from "../../redux/api/uploadApiSlice";
import {
  selectedUserAvatar,
  selectedUserName,
  selectedUserEmail,
  setUser,
  selectedUserId,
  selectedUserToken,
} from "../../redux/auth/authSlice";
// MUI Imports
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  Tooltip,
  Avatar,
} from "@mui/material";
import AppContainer from "../../components/ui/AppContainer";
import AppCard from "../../components/ui/AppCard";
import AppButton from "../../components/ui/AppButton";

interface ISProfileForm {
  userName: string;
  email: string;
  password: string;
}

const getInitials = (name?: string) => {
  if (!name) {
    return "U";
  }

  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
};

// Firebase Storage
// allow read;
// allow write: if
// request.resource.size < 2 * 1024 * 1024 &&
// request.resource.contentType.matches('image/.*')

const Profile = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const fileRef = useRef<HTMLInputElement | null | any>(null);

  const userName = useTypedSelector(selectedUserName);
  const userEmail = useTypedSelector(selectedUserEmail);
  const userAvatar = useTypedSelector(selectedUserAvatar);
  const userId = useTypedSelector(selectedUserId);
  const token = useTypedSelector(selectedUserToken);
  const [getR2SignedUrl] = useGetR2SignedUrlMutation();
  const firstName = getFirstName(userName);

  // states
  const [file, setFile] = useState<File | null>(null);
  const [fileUploadError, setFileUploadError] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [filePercentage, setFilePercentage] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [formValues, setFormValues] = useState<ISProfileForm>({
    userName,
    email: userEmail,
    password: "",
  });
  const [toast, setToast] = useState({
    message: "",
    appearence: false,
    type: "",
  });
  const [confirmDialog, setConfirmDialog] = useState(false);

  useEffect(() => {
    if (file) {
      handleFileUpload(file);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const handleFileUpload = async (file: File) => {
    if (!token) {
      setToast({
        ...toast,
        message: "Session expired. Please log in again.",
        appearence: true,
        type: "error",
      });
      navigate("/login");
      return;
    }

    let result: R2SignedUrlData;

    try {
      result = await getR2SignedUrl({
        contentType: file.type,
        folder: "avatars",
      }).unwrap();
    } catch (error: any) {
      console.error(error);

      if (error?.status === 401 || error?.originalStatus === 401) {
        setToast({
          ...toast,
          message: "Session expired. Please log in again.",
          appearence: true,
          type: "error",
        });
        navigate("/login");
        setFileUploadError(true);
        return;
      }

      setFileUploadError(true);
      return;
    }

    try {
      const { uploadUrl, publicUrl } = result;

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!putRes.ok) throw new Error("R2 upload failed");

      setFormData({ ...formData, avatar: publicUrl });
      setFile(null);
      setFilePercentage(100);
    } catch (e) {
      console.error(e);
      setFileUploadError(true);
    }
  };

  const hideShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleCloseToast = () => {
    setToast({ ...toast, appearence: false });
  };

  // Update Profile API bind
  const [updateProfile, { isLoading }] = useUpdateMutation();

  const ProfileHandler = async (data: ISProfileForm) => {
    const payload = {
      username: data.userName,
      email: data.email,
      password: data.password,
      avatar: formData.avatar || userAvatar,
    };

    try {
      const user: any = await updateProfile({
        id: userId,
        payload,
      });
      if (user?.data?.status) {
        setToast({
          ...toast,
          message: "User Updated Successfully",
          appearence: true,
          type: "success",
        });
        dispatch(setUser(user?.data));
        localStorage.setItem("user", JSON.stringify(user?.data));
        navigate("/");
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
      console.error("Profile Upload Error:", error);
      setToast({
        ...toast,
        message: "Something went wrong",
        appearence: true,
        type: "error",
      });
    }
  };

  // Delete Account API bind
  const [deleteAccount, { isLoading: deleteLoading }] = useDeleteMutation();

  const deleteHandler = async () => {
    try {
      const user: any = await deleteAccount(userId);
      if (user?.data === null) {
        setToast({
          ...toast,
          message: "Account Deleted Successfully",
          appearence: true,
          type: "success",
        });
        dispatch(setUser(null));
        localStorage.removeItem("user");
        navigate("/login");
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
      console.error("Delete Account Error:", error);
      setToast({
        ...toast,
        message: "Something went wrong",
        appearence: true,
        type: "error",
      });
    }
  };

  return (
    <Box sx={{ minHeight: "calc(100vh - 72px)", background: "background.default" }}>
      <Box
        sx={{
          background: "linear-gradient(135deg, #1F2937 0%, #1F4D3A 100%)",
          pt: { xs: 8, md: 10 },
          pb: { xs: 8, md: 10 },
          px: 3,
          textAlign: "center",
          mb: -6,
        }}
      >
        <Box
          sx={{
            fontSize: { xs: "1.5rem", md: "2rem" },
            fontWeight: 800,
            color: "#fff",
          }}
        >
          {getGreeting(userName)}
        </Box>
        <Box sx={{ color: "rgba(255,255,255,0.7)", fontSize: "1rem", mt: 1 }}>
          Manage your account details and preferences
        </Box>
      </Box>
      <AppContainer sx={{ pb: { xs: 4, md: 6 } }}>
        <Grid container spacing={2} justifyContent="center">
          <Grid item xs={12} md={7} lg={6}>
            <AppCard sx={{ p: { xs: 2.5, md: 3.5 }, borderRadius: "24px" }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  flexDirection: "column",
                }}
              >
                <Tooltip title="Upload Image" placement="right">
                  <Box sx={{ marginTop: "30px", cursor: "pointer" }}>
                    <input
                      onChange={(e) => {
                        if (e.target.files) {
                          setFile(e.target.files[0]);
                        }
                      }}
                      hidden
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      name=""
                      id=""
                    />
                    <Box
                      onClick={() => fileRef.current.click()}
                      sx={{
                        position: "relative",
                        width: 95,
                        height: 95,
                        cursor: "pointer",
                        "&:hover .upload-overlay": { opacity: 1 },
                      }}
                    >
                      {formData.avatar || userAvatar ? (
                        <Avatar
                          src={formData.avatar || userAvatar}
                          alt={`${firstName} avatar`}
                          sx={{
                            width: 95,
                            height: 95,
                            border: "3px solid #B8975A",
                          }}
                        />
                      ) : (
                        <Avatar
                          alt={`${firstName} avatar`}
                          sx={{
                            width: 95,
                            height: 95,
                            bgcolor: "#B8975A",
                            fontSize: "2rem",
                          }}
                        >
                          {getInitials(userName)}
                        </Avatar>
                      )}
                      <Box
                        className="upload-overlay"
                        sx={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: "50%",
                          background: "rgba(0,0,0,0.45)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: 0,
                          transition: "opacity 0.2s",
                        }}
                      >
                        <Camera size={22} color="#fff" />
                      </Box>
                    </Box>
                    <Box
                      sx={{
                        fontSize: "12px",
                        color: "text.secondary",
                        mt: 1,
                        textAlign: "center",
                      }}
                    >
                      Click to change photo
                    </Box>
                  </Box>
                </Tooltip>
                <Box sx={{ marginTop: "7px" }}>
                  {fileUploadError ? (
                    <Box sx={{ color: "#d32f2f", fontWeight: 400 }}>
                      File Upload Error
                      <span style={{ marginLeft: "3px" }}>
                        (Image be less than 2Mb)
                      </span>
                    </Box>
                  ) : filePercentage > 0 && filePercentage < 100 ? (
                    <Box
                      sx={{ color: "#334155", fontweight: 400 }}
                    >{`Uploading ${filePercentage}%`}</Box>
                  ) : filePercentage === 100 ? (
                    <Box sx={{ color: "#1db45a", fontWeight: 500 }}>
                      Image Successfully Uploaded!
                    </Box>
                  ) : (
                    ""
                  )}
                </Box>
              </Box>

              <Box sx={{ width: "100%" }}>
                <Formik
                  initialValues={formValues}
                  onSubmit={(values: ISProfileForm) => {
                    ProfileHandler(values);
                  }}
                  validationSchema={signUpSchema}
                >
                  {(props: FormikProps<ISProfileForm>) => {
                    const { values, touched, errors, handleBlur, handleChange } =
                      props;

                    return (
                      <Form onKeyDown={onKeyDown}>
                        <Box sx={{ minHeight: "72px", marginTop: "20px" }}>
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
                        <Box sx={{ minHeight: "72px" }}>
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
                        <Box sx={{ minHeight: "72px" }}>
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
                                <Eye size={18} />
                              ) : (
                                <EyeOff size={18} />
                              )
                            }
                          />
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "flex-end",
                            marginTop: "16px",
                          }}
                        >
                          <AppButton
                            type="submit"
                            fullWidth
                            disabled={isLoading}
                            sx={{ margin: "0 0 20px 0" }}
                          >
                            {isLoading ? (
                              <DotLoader color="#fff" size={12} />
                            ) : (
                              "Update"
                            )}
                          </AppButton>
                        </Box>
                        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                          <AppButton
                            variant="outlined"
                            color="error"
                            disabled={deleteLoading}
                            startIcon={<Trash2 size={16} />}
                            onClick={() => setConfirmDialog(true)}
                          >
                            Delete Account
                          </AppButton>
                        </Box>
                      </Form>
                    );
                  }}
                </Formik>
              </Box>
            </AppCard>
          </Grid>
        </Grid>
      </AppContainer>
      <ToastAlert
        appearence={toast.appearence}
        type={toast.type}
        message={toast.message}
        handleClose={handleCloseToast}
      />
      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Permanently delete your account? All your data will be removed and
            cannot be recovered.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <AppButton variant="outlined" onClick={() => setConfirmDialog(false)}>
            Go Back
          </AppButton>
          <AppButton
            color="error"
            disabled={deleteLoading}
            onClick={() => {
              deleteHandler();
              setConfirmDialog(false);
            }}
          >
            Delete Account
          </AppButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Profile;
