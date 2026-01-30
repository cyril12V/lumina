import nodemailer from 'nodemailer';

// Configure transporter (use environment variables in production)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
});

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const emailService = {
  /**
   * Send an email
   */
  async send(params: EmailParams): Promise<boolean> {
    try {
      // In development, log instead of sending
      if (process.env.NODE_ENV !== 'production' && !process.env.SMTP_USER) {
        console.log('📧 Email would be sent:');
        console.log(`  To: ${params.to}`);
        console.log(`  Subject: ${params.subject}`);
        console.log(`  Content: ${params.text || params.html.substring(0, 100)}...`);
        return true;
      }

      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Lumina" <noreply@lumina.app>',
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text
      });

      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  },

  /**
   * Send questionnaire link to client
   */
  async sendQuestionnaireLink(params: {
    clientEmail: string;
    clientName: string;
    photographerName: string;
    linkUrl: string;
    expiresAt?: string;
  }): Promise<boolean> {
    const expirationText = params.expiresAt
      ? `Ce lien est valide jusqu'au ${new Date(params.expiresAt).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        })}.`
      : '';

    return this.send({
      to: params.clientEmail,
      subject: `${params.photographerName} - Questionnaire pour votre projet`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Bienvenue !</h1>
            </div>
            <div class="content">
              <p>Bonjour ${params.clientName},</p>
              <p><strong>${params.photographerName}</strong> vous invite à remplir un questionnaire pour préparer votre projet photo.</p>
              <p>Ce questionnaire nous permettra de mieux comprendre vos attentes et de personnaliser notre prestation.</p>
              <p style="text-align: center;">
                <a href="${params.linkUrl}" class="button">Accéder au questionnaire</a>
              </p>
              <p>${expirationText}</p>
              <p>Si vous avez des questions, n'hésitez pas à contacter directement ${params.photographerName}.</p>
            </div>
            <div class="footer">
              <p>Cet email a été envoyé via Lumina</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Bonjour ${params.clientName},\n\n${params.photographerName} vous invite à remplir un questionnaire pour préparer votre projet photo.\n\nAccédez au questionnaire : ${params.linkUrl}\n\n${expirationText}`
    });
  },

  /**
   * Notify photographer when questionnaire is validated
   */
  async sendQuestionnaireValidated(params: {
    photographerEmail: string;
    photographerName: string;
    clientName: string;
    eventType: string;
    dashboardUrl: string;
  }): Promise<boolean> {
    return this.send({
      to: params.photographerEmail,
      subject: `Questionnaire validé - ${params.clientName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: white; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✓ Questionnaire validé</h1>
            </div>
            <div class="content">
              <p>Bonjour ${params.photographerName},</p>
              <p><strong>${params.clientName}</strong> a validé son questionnaire.</p>
              <div class="info-box">
                <p><strong>Type d'événement :</strong> ${params.eventType}</p>
              </div>
              <p>Vous pouvez maintenant générer le contrat basé sur ses réponses.</p>
              <p style="text-align: center;">
                <a href="${params.dashboardUrl}" class="button">Voir les réponses</a>
              </p>
            </div>
            <div class="footer">
              <p>Lumina - Gestion photographe</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Bonjour ${params.photographerName},\n\n${params.clientName} a validé son questionnaire (${params.eventType}).\n\nAccédez à votre dashboard : ${params.dashboardUrl}`
    });
  },

  /**
   * Send contract ready notification to client
   */
  async sendContractReady(params: {
    clientEmail: string;
    clientName: string;
    photographerName: string;
    linkUrl: string;
  }): Promise<boolean> {
    return this.send({
      to: params.clientEmail,
      subject: `${params.photographerName} - Votre contrat est prêt`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Contrat prêt à signer</h1>
            </div>
            <div class="content">
              <p>Bonjour ${params.clientName},</p>
              <p><strong>${params.photographerName}</strong> a préparé votre contrat de prestation photographique.</p>
              <p>Veuillez le consulter et le signer électroniquement pour confirmer votre réservation.</p>
              <p style="text-align: center;">
                <a href="${params.linkUrl}" class="button">Consulter et signer le contrat</a>
              </p>
              <p>Si vous avez des questions sur le contenu du contrat, n'hésitez pas à contacter ${params.photographerName} avant de signer.</p>
            </div>
            <div class="footer">
              <p>Cet email a été envoyé via Lumina</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Bonjour ${params.clientName},\n\n${params.photographerName} a préparé votre contrat.\n\nConsultez et signez : ${params.linkUrl}`
    });
  },

  /**
   * Notify photographer when contract is signed
   */
  async sendContractSigned(params: {
    photographerEmail: string;
    photographerName: string;
    clientName: string;
    signedAt: string;
    dashboardUrl: string;
  }): Promise<boolean> {
    return this.send({
      to: params.photographerEmail,
      subject: `✓ Contrat signé - ${params.clientName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: white; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Contrat signé !</h1>
            </div>
            <div class="content">
              <p>Bonjour ${params.photographerName},</p>
              <p>Excellente nouvelle ! <strong>${params.clientName}</strong> a signé le contrat.</p>
              <div class="info-box">
                <p><strong>Signé le :</strong> ${new Date(params.signedAt).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>
              <p>Le contrat signé est maintenant disponible dans l'espace client.</p>
              <p style="text-align: center;">
                <a href="${params.dashboardUrl}" class="button">Voir le contrat signé</a>
              </p>
            </div>
            <div class="footer">
              <p>Lumina - Gestion photographe</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Bonjour ${params.photographerName},\n\n${params.clientName} a signé le contrat le ${new Date(params.signedAt).toLocaleDateString('fr-FR')}.\n\nAccédez à votre dashboard : ${params.dashboardUrl}`
    });
  },

  /**
   * Send gallery access notification
   */
  async sendGalleryReady(params: {
    clientEmail: string;
    clientName: string;
    photographerName: string;
    galleryName: string;
    linkUrl: string;
  }): Promise<boolean> {
    return this.send({
      to: params.clientEmail,
      subject: `${params.photographerName} - Vos photos sont prêtes !`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📸 Vos photos sont prêtes !</h1>
            </div>
            <div class="content">
              <p>Bonjour ${params.clientName},</p>
              <p><strong>${params.photographerName}</strong> a mis en ligne votre galerie photo : <em>${params.galleryName}</em></p>
              <p style="text-align: center;">
                <a href="${params.linkUrl}" class="button">Voir ma galerie</a>
              </p>
              <p>Nous espérons que ces photos vous plairont !</p>
            </div>
            <div class="footer">
              <p>Cet email a été envoyé via Lumina</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Bonjour ${params.clientName},\n\n${params.photographerName} a mis en ligne votre galerie : ${params.galleryName}\n\nAccédez à votre galerie : ${params.linkUrl}`
    });
  }
};

export default emailService;
