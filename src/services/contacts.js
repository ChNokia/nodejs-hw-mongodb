import ContactCollection from '../db/models/Contact.js';

export const getContacts = () => ContactCollection.find();

export const getContactById = (id) => ContactCollection.findById(id);

export const createContact = async (payload) => {
  const contact = await ContactCollection.create(payload);

  return contact;
};

export const deleteContact = async (id) => {
  const contact = await ContactCollection.findByIdAndDelete({
    _id: id,
  });

  return contact;
};

export const updateContact = async (id, payload, options = {}) => {
  const rawResult = await ContactCollection.findOneAndUpdate(
    { _id: id },
    payload,
    {
      new: true,
      includeResultMetadata: true,
      ...options,
    },
  );

  if (!rawResult || !rawResult.value) return null;

  return rawResult.value;
};
