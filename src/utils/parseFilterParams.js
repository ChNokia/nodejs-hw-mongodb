import { contactTypeList } from '../constants/contacts.js';

const parseContactType = (type) => {
  if (typeof type !== 'string') {
    return;
  }

  if (contactTypeList.includes(type)) {
    return type;
  }
};

const parseFavourite = (isFavourite) => {
  if (typeof isFavourite !== 'string') {
    return;
  }

  switch (isFavourite.toLowerCase().trim()) {
    case 'true':
      return true;
    case 'false':
      return false;

    default:
      return;
  }
};

export const parseFilterParams = (query) => {
  const { isFavourite, type } = query;

  const parsedType = parseContactType(type);
  const parsedFavourite = parseFavourite(isFavourite);

  return {
    type: parsedType,
    isFavourite: parsedFavourite,
  };
};
