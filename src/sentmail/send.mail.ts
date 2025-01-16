import { envs } from '../core/config/env';
import nodemailer from 'nodemailer'


const sendMail = (email: string,subject: string, html: string) => {
    // configuring nodemailer

    const transporter = nodemailer.createTransport({
        service: envs.SERVICE,
        host: process.env.MAIL_HOST,
        port: Number(envs.MAIL_PORT),
        secure: Boolean(envs.MAIL_SECURE),
        auth: {
            user: envs.MAIL_USER,
            pass: process.env.MAIL_PASS,
        },
    });
    // composing the mail
    const mailOptions = {
        from:  envs.MAIL_FROM,
        to: email,
        subject,
        html
    };
    // sending the mail
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("Error sending email: ", error);
        } else {
            console.log("Email sent: ", info.response);
        }
    });


}
export default sendMail