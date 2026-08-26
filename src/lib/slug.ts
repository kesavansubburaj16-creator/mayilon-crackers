export function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export const SITE = {
  name: "Mayilon Crackers",
  tagline: "ஒவ்வொரு வெடியிலும் மகிழ்ச்சி!",
  taglineEn: "Joy in every burst",
  phone: "+91 70101 16061",
  phoneRaw: "917010116061",
  phoneAlt1: "+91 99949 48674",
  phoneAlt1Raw: "919994948674",
  phoneAlt2: "+91 97865 10405",
  phoneAlt2Raw: "919786510405",
  whatsapp: "917010116061",
  email: "sales@mayiloncrackers.com",
  address: "142/3A Viswanatham Road, Sivakasi, Tamil Nadu - 626123",
  url: "https://mayiloncrackers.com",
  gst: "33AABCM1234K1ZQ",
  license: "PESO / E-13579 / Sivakasi",
};

export function waLink(text: string) {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;
}
