import Course from "../models/Course.model.js";
import Progress from "../models/Progress.model.js";
import { createCheckoutSession, stripe } from "../services/payment.service.js";

const fulfillCourseEnrollment = async ({ courseId, studentId }) => {
  const course = await Course.findById(courseId);
  if (!course) {
    throw new Error("Course not found");
  }

  const studentIdStr = studentId.toString();

  const isInStudents = course.students.some(
    (id) => id.toString() === studentIdStr
  );
  if (!isInStudents) {
    course.students.push(studentId);
  }

  const hasEnrollment = course.enrolledStudents.some(
    (e) => e.student?.toString() === studentIdStr
  );
  if (!hasEnrollment) {
    course.enrolledStudents.push({ student: studentId });
  }

  await course.save();

  await Progress.updateOne(
    { user: studentId, course: course._id },
    {
      $setOnInsert: {
        user: studentId,
        course: course._id,
        completedLessons: [],
        completedCount: 0
      }
    },
    { upsert: true }
  );

  return course;
};

export const createPayment = async (req, res) => {
  try {
    const { courseId } = req.body;
    const studentId = req.user.id;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const session = await createCheckoutSession({
      course,
      studentId
    });

    res.json({ url: session.url });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const confirmPayment = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ message: "sessionId is required" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return res.status(402).json({ message: "Payment not completed" });
    }

    const { studentId, courseId } = session.metadata || {};
    if (!studentId || !courseId) {
      return res.status(400).json({ message: "Missing checkout metadata" });
    }

    if (studentId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await fulfillCourseEnrollment({ courseId, studentId });

    res.status(200).json({ success: true, message: "Enrollment completed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const stripeWebhook = async (req, res) => {
  const signature = req.headers["stripe-signature"];

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).json({ message: "Missing STRIPE_WEBHOOK_SECRET" });
  }

  let event;
  try {
    const payload = req.rawBody || req.body;
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const { studentId, courseId } = session.metadata || {};

      if (studentId && courseId) {
        await fulfillCourseEnrollment({ courseId, studentId });
      }
    }

    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
