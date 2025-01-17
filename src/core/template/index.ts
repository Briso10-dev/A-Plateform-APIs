// File: src/core/template/index.ts
import ejs from "ejs";
import path from "path";

const EmailTemplate = {
  OPTcodeSender: async (userName: string, message: string, OTPcode: number) => {
    try {
      const html = await ejs.renderFile(path.join(__dirname, "otp.ejs"), {
        userName,
        message,
        OTPcode, // Match variable name with the template
      });
      return html;
    } catch (error) {
      console.error("Error rendering template:", error);
      return "";
    }
  },
};

export default EmailTemplate;