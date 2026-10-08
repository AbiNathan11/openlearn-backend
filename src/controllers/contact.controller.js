import Contact from "../models/Contact.model.js";

export const submitContact = async (req, res) => {
    try {
        const { name, email, message } = req.body;
        
        if (!name || !email || !message) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const newContact = new Contact({ name, email, message });
        await newContact.save();

        res.status(201).json({ message: "Message sent successfully" });
    } catch (error) {
        console.error("Error submitting contact:", error);
        res.status(500).json({ message: "Failed to send message" });
    }
};

export const getAllContacts = async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ createdAt: -1 });
        res.status(200).json(contacts);
    } catch (error) {
        console.error("Error fetching contacts:", error);
        res.status(500).json({ message: "Failed to fetch messages" });
    }
};

export const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const contact = await Contact.findByIdAndUpdate(id, { status: "read" }, { new: true });
        if (!contact) {
            return res.status(404).json({ message: "Message not found" });
        }
        res.status(200).json(contact);
    } catch (error) {
        console.error("Error updating contact:", error);
        res.status(500).json({ message: "Failed to update message" });
    }
};

export const deleteContact = async (req, res) => {
    try {
        const { id } = req.params;
        const contact = await Contact.findByIdAndDelete(id);
        if (!contact) {
            return res.status(404).json({ message: "Message not found" });
        }
        res.status(200).json({ message: "Message deleted successfully" });
    } catch (error) {
        console.error("Error deleting contact:", error);
        res.status(500).json({ message: "Failed to delete message" });
    }
};
