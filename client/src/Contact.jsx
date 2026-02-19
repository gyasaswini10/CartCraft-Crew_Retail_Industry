import React, { useState } from "react";
import {
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Grid,
} from "@mui/material";
import { useForm } from "react-hook-form";
import emailjs from "emailjs-com";

const Contact = () => {
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm();
    const [messageSent, setMessageSent] = useState(null);

    const inputStyle = {
        "& .MuiOutlinedInput-root": {
            backgroundColor: "white",
            color: "black",
            border: "1px solid #ccc",
        },
        "& .MuiInputLabel-root": {
            color: "black",
        },
        "& .MuiInput-underline:before": {
            borderBottomColor: "black",
        },
        "&:hover .MuiOutlinedInput-root": {
            borderColor: "black",
        },
        "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "black",
        }
    };

    const onSubmit = (data) => {
        const emailParams = {
            from_name: data.fullName,
            email: data.email,
            reply_to: data.email,
            message: data.message,
        };

        emailjs
            .send(
                "service_q9677jj", // Service ID
                "template_svgb61i", // Template ID 
                emailParams,
                "Dv8hLLn2aELFSWcCg" // Public Key
            )
            .then((response) => {
                console.log("SUCCESS!", response.status, response.text);
                setMessageSent("Your message has been sent successfully!");
                reset();
            })
            .catch((err) => {
                console.error("FAILED...", err);
                setMessageSent(
                    `Failed to send the message. Error: ${err.text || "Unknown error"}`
                );
            });
    };

    return (
        <div
            id="contact"
            style={{
                marginTop: "2rem",
                padding: "2rem",
                backgroundColor: "white",
                color: "black",
                marginBottom: "2rem",
            }}
        >
            <div className="section-header" style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <h2 style={{ textTransform: 'uppercase', fontWeight: 700, fontSize: '2.5rem', marginBottom: '1rem' }}>CONTACT</h2>
                <div style={{ width: '60px', height: '4px', background: '#4caf50', margin: '0 auto' }}></div>
            </div>

            <Typography variant="body1" align="center" paragraph style={{ marginBottom: '3rem', fontSize: '1.2rem', color: '#666' }}>
                We are here to assist you! Feel free to reach out to us for any
                inquiries or feedback.
            </Typography>

            <Grid container spacing={4} justifyContent="center" style={{ marginBottom: '4rem' }}>
                <Grid item xs={12} sm={4}>
                    <Card
                        variant="outlined"
                        style={{
                            height: "100%",
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                            borderRadius: "12px",
                            backgroundColor: "white",
                            color: "black",
                            textAlign: 'center',
                        }}
                    >
                        <CardContent>
                            <Typography variant="h5" gutterBottom style={{ fontWeight: 'bold' }}>Address</Typography>
                            <Typography variant="body1">
                                123 Market Street, Grocery Town, GT 54321
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={4}>
                    <Card
                        variant="outlined"
                        style={{
                            height: "100%",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                            borderRadius: "12px",
                            backgroundColor: "white",
                            color: "black",
                            textAlign: 'center',
                        }}
                    >
                        <CardContent>
                            <Typography variant="h5" gutterBottom style={{ fontWeight: 'bold' }}>Phone</Typography>
                            <Typography variant="body1"> +1-555-123-4567 </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={4}>
                    <Card
                        variant="outlined"
                        style={{
                            height: "100%",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                            borderRadius: "12px",
                            backgroundColor: "white",
                            color: "black",
                            textAlign: 'center',
                        }}
                    >
                        <CardContent>
                            <Typography variant="h5" gutterBottom style={{ fontWeight: 'bold' }}>Emails</Typography>
                            <Typography variant="body1">
                                support@freshmart.com
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <div style={{ marginBottom: "4rem" }}>
                <Typography variant="h4" align="center" style={{ marginBottom: '1.5rem', fontWeight: 'bold' }}>Send Message</Typography>
                <form
                    onSubmit={handleSubmit(onSubmit)}
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        maxWidth: "500px",
                        margin: "auto",
                        gap: "1rem"
                    }}
                >
                    <TextField
                        label="Full Name"
                        variant="outlined"
                        required
                        {...register("fullName", {
                            required: "Full Name is required",
                            pattern: {
                                value: /^[A-Za-z\s]+$/,
                                message: "Only alphabets are allowed",
                            },
                        })}
                        error={Boolean(errors.fullName)}
                        helperText={errors.fullName?.message}
                        color="success"
                        InputLabelProps={{ style: { color: "#555" } }}
                        InputProps={{ style: { color: "black", background: '#f8f9fa' } }}
                        sx={inputStyle}
                        fullWidth
                    />
                    <TextField
                        label="Email"
                        variant="outlined"
                        required
                        {...register("email", {
                            required: "Email is required",
                            pattern: {
                                value: /^\S+@\S+\.\S+$/,
                                message: "Enter a valid email",
                            },
                        })}
                        error={Boolean(errors.email)}
                        helperText={errors.email?.message}
                        color="success"
                        InputLabelProps={{ style: { color: "#555" } }}
                        InputProps={{ style: { color: "black", background: '#f8f9fa' } }}
                        sx={inputStyle}
                        fullWidth
                    />
                    <TextField
                        label="Type your Message"
                        variant="outlined"
                        required
                        multiline
                        rows={4}
                        {...register("message", { required: "Message is required" })}
                        error={Boolean(errors.message)}
                        helperText={errors.message?.message}
                        color="success"
                        InputLabelProps={{ style: { color: "#555" } }}
                        InputProps={{ style: { color: "black", background: '#f8f9fa' } }}
                        sx={inputStyle}
                        fullWidth
                    />
                    <Button
                        variant="contained"
                        sx={{
                            backgroundColor: "black",
                            color: "white",
                            padding: "12px",
                            fontSize: "1rem",
                            fontWeight: "bold",
                            borderRadius: "2px",
                            "&:hover": {
                                backgroundColor: "#333",
                            },
                        }}
                        type="submit"
                        fullWidth
                    >
                        Send
                    </Button>
                </form>

                {messageSent && (
                    <Typography
                        variant="body1"
                        align="center"
                        style={{
                            marginTop: "20px",
                            color: messageSent.includes("successfully") ? "green" : "red",
                            fontWeight: "bold",
                        }}
                    >
                        {messageSent}
                    </Typography>
                )}
            </div>

            {/* Map Section */}
            <div style={{ height: "450px", width: "100%", borderRadius: "12px", overflow: "hidden", boxShadow: "0 4px 15px rgba(0,0,0,0.1)" }}>
                <iframe
                    title="Store Location Map"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d193595.1583086942!2d-74.119763973049!3d40.6976700673559!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c2593a6b8b4b1b%3A0x4b8b8b8b8b8b8b8b!2sManhattan%2C%20New%20York%2C%20NY%2C%20USA!5e0!3m2!1sen!2sus!4v1234567890"
                    allowFullScreen=""
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade">
                </iframe>
            </div>
        </div>
    );
};

export default Contact;
