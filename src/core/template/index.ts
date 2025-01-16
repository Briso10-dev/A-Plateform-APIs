// File: src/core/template/index.ts
import ejs from "ejs";
import path from "path";

const EmailTemplate = {
  QRcodeSender: async (userName:string,message: string,OPTcode:number) => {
    try {
      const html = await ejs.renderFile(path.join(__dirname, "otp.ejs"), {
        userName,
        message,
        OPTcode
      });
      return html;
    } catch (error) {
      console.error("Error rendering Reminder template:", error);
      return "";
    }
  },
};

export default EmailTemplate;