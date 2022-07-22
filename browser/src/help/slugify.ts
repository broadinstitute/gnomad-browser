const slugify = (string: any) =>
  string
    .toLowerCase()
    .replace(/\s+|\/|_|,|:|;/g, '-') // Replace spaces and special characters with -
    .replace(/[^\w-]+/g, '') // Remove all non-word characters
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, '') // Trim - from end of text

export default slugify
