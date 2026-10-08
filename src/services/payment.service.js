import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createCheckoutSession = async ({
  course,
  studentId
}) => {
  const coursePriceCents = Math.max(0, Math.round(Number(course.price || 0) * 100));
  const platformFeeCents = 100;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",

    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: course.title
          },
          unit_amount: coursePriceCents
        },
        quantity: 1
      },
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Platform Fee"
          },
          unit_amount: platformFeeCents
        },
        quantity: 1
      }
    ],

    success_url: `${process.env.CLIENT_URL}/payment-success?course=${course._id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/payment-cancel`,

    metadata: {
      studentId: studentId.toString(),
      courseId: course._id.toString()
    }
  });

  return session;
};
