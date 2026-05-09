const nodemailer = require("nodemailer");

const sendWithGmail = ({ from, to, subject, text, html }) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  return transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
};

exports.sendEmail = async ({ to, subject, text, html }) => {
  const { GMAIL_USER, EMAIL_FROM } = process.env;
  const from = EMAIL_FROM || GMAIL_USER;

  if (process.env.NODE_ENV === 'test' || !GMAIL_USER) {
    // eslint-disable-next-line no-console
    console.log("[email:mock]", { to, subject, text, html });
    return { mocked: true };
  }

  return sendWithGmail({
    from,
    to,
    subject,
    text,
    html,
  });
};
