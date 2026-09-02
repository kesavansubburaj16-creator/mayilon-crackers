import fs from "fs";
import path from "path";
import os from "os";

export type OrderItemRecord = {
  id: string;
  sku: string;
  name: string;
  categoryName: string;
  packing: string;
  imageUrl?: string;
  mrp: string | number;
  price: string | number;
  quantity: number;
  lineTotal: string | number;
};

export type OrderRecord = {
  id: string;
  estimateNumber: string;
  customerName: string;
  mobile: string;
  email: string;
  state: string;
  district: string;
  city: string;
  pincode: string;
  address: string;
  gstNumber?: string;
  dealerName?: string;
  transportName?: string;
  deliveryLocation?: string;
  instructions?: string;
  paymentMethod: string;
  paymentStatus: "PAID" | "UNPAID" | "PENDING VERIFICATION";
  status: "NEW" | "PAYMENT RECEIVED" | "PACKAGE READY" | "SHIPPED" | "OUT FOR DELIVERY" | "DELIVERED" | "CANCELLED";
  itemCount: number;
  mrpTotal: string;
  subtotal: string;
  savings: string;
  discount: string;
  transportCharge: string;
  gstAmount: string;
  grandTotal: string;
  couponCode?: string;
  paymentProofUrl?: string;
  transactionId?: string;
  createdAt: string;
  items: OrderItemRecord[];
};

const DATA_FILE = path.join(os.tmpdir(), "mayilon_orders.json");

function syncFileSave(orders: OrderRecord[]) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(orders), "utf-8");
  } catch (err) {}
}

function syncFileLoad(): OrderRecord[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch (err) {}
  return [];
}

const INITIAL_SEED_ORDERS: OrderRecord[] = [
  {
    id: "est-2608-884390",
    estimateNumber: "MYL-2608-884390",
    customerName: "dsafdsdf",
    mobile: "8545265223",
    email: "rajeswariproperties@gmail.com",
    state: "Tamil Nadu",
    district: "Namakkal",
    city: "Namakkal",
    pincode: "637015",
    address: "363/5 vetrivel nagar , murugan kovil Back side namakkal, hgfhfghfgjfj, Tamil Nadu, 637015",
    gstNumber: "JGHJGHJGHJGHJGHJGHJ",
    transportName: "Direct Factory Transport",
    deliveryLocation: "Sivakasi Licensed Dispatch",
    paymentMethod: "COD",
    paymentStatus: "PAID",
    status: "SHIPPED",
    itemCount: 1,
    mrpTotal: "371700.00",
    subtotal: "74340.00",
    savings: "297360.00",
    discount: "0.00",
    transportCharge: "0.00",
    gstAmount: "0.00",
    grandTotal: "74340.00",
    createdAt: "2026-09-02T20:38:00.000Z",
    items: [
      { id: "prod-115", sku: "MYL-RKT-01", name: "Musical Rocket", categoryName: "Rockets", packing: "1 Box", mrp: "1062.00", price: "212.40", quantity: 350, lineTotal: "74340.00" },
    ],
  },
  {
    id: "est-2608-202495",
    estimateNumber: "MYL-2608-202495",
    customerName: "Karuppu 2",
    mobile: "9562156358",
    email: "sdasdasfsdsdtgf@gmail.com",
    state: "Tamil Nadu",
    district: "Chennai",
    city: "Chennai",
    pincode: "600100",
    address: "erfsefsdfsd ergdretgdrg d erg tdsartgdr erg thgergh erer ehgesrher ergaerg gergher esraerr er regerger sdfgdfgdfgdfgdfg, dsdasdsf, Tamil Nadu, 600100",
    transportName: "Direct Factory Transport",
    deliveryLocation: "Sivakasi Licensed Dispatch",
    paymentMethod: "COD",
    paymentStatus: "UNPAID",
    status: "NEW",
    itemCount: 5,
    mrpTotal: "100000.00",
    subtotal: "20000.00",
    savings: "80000.00",
    discount: "0.00",
    transportCharge: "0.00",
    gstAmount: "0.00",
    grandTotal: "20000.00",
    createdAt: "2026-09-02T16:07:00.000Z",
    items: [
      { id: "prod-110", sku: "MYL-GFT-05", name: "50 Items (10pc packs)", categoryName: "Gift Boxes", packing: "1 Box", mrp: "5000.00", price: "1000.00", quantity: 20, lineTotal: "20000.00" },
    ],
  },
  {
    id: "est-2608-903463",
    estimateNumber: "MYL-2608-903463",
    customerName: "Karuppu",
    mobile: "9562156358",
    email: "sdasdasfsdsdtgf@gmail.com",
    state: "Tamil Nadu",
    district: "Chennai",
    city: "Chennai",
    pincode: "600042",
    address: "erfsefsdfsd ergdretgdrg d erg tdsartgdr erg thgergh erer ehgesrher ergaerg gergher esraerr er regerger sdfgdfgdfgdfgdfg, sfsdgsdgdsfg, Tamil Nadu, 600042",
    transportName: "Direct Factory Transport",
    deliveryLocation: "Sivakasi Licensed Dispatch",
    paymentMethod: "UPI Verification",
    paymentStatus: "PAID",
    status: "PAYMENT RECEIVED",
    itemCount: 5,
    mrpTotal: "100000.00",
    subtotal: "20000.00",
    savings: "80000.00",
    discount: "0.00",
    transportCharge: "0.00",
    gstAmount: "0.00",
    grandTotal: "20000.00",
    createdAt: "2026-09-02T15:48:00.000Z",
    items: [
      { id: "prod-110", sku: "MYL-GFT-05", name: "50 Items (10pc packs)", categoryName: "Gift Boxes", packing: "1 Box", mrp: "5000.00", price: "1000.00", quantity: 20, lineTotal: "20000.00" },
    ],
  },
  {
    id: "est-2608-843465",
    estimateNumber: "MYL-2608-843465",
    customerName: "SARAVA",
    mobile: "7845128956",
    email: "adsdasdasd@gmail.com",
    state: "Tamil Nadu",
    district: "Chennai",
    city: "Chennai",
    pincode: "600041",
    address: "medavakkam fsdds gsdgsd sd dsfsdfgsdfgsdfg, asfdfdsf, Tamil Nadu, 600041",
    transportName: "Direct Factory Transport",
    deliveryLocation: "Sivakasi Licensed Dispatch",
    paymentMethod: "COD",
    paymentStatus: "UNPAID",
    status: "NEW",
    itemCount: 1,
    mrpTotal: "25000.00",
    subtotal: "5000.00",
    savings: "20000.00",
    discount: "0.00",
    transportCharge: "0.00",
    gstAmount: "0.00",
    grandTotal: "5000.00",
    createdAt: "2026-09-01T05:02:00.000Z",
    items: [
      { id: "prod-110", sku: "MYL-GFT-05", name: "50 Items (10pc packs)", categoryName: "Gift Boxes", packing: "1 Box", mrp: "5000.00", price: "1000.00", quantity: 5, lineTotal: "5000.00" },
    ],
  },
  {
    id: "est-1788238469070-k5dr",
    estimateNumber: "MYL-2608-234565",
    customerName: "Surjith Thangavel",
    mobile: "8667038564",
    email: "sujithjai007@gmail.com",
    state: "Tamil Nadu",
    district: "Namakkal",
    city: "Tiruchengode",
    pincode: "637211",
    address: "7/148,athurampalayam,karuveppampatti(p.o),tiruchengode(t.k),namakkal, Tamil Nadu",
    transportName: "Direct Factory Transport",
    deliveryLocation: "Sivakasi Licensed Dispatch",
    paymentMethod: "COD",
    paymentStatus: "UNPAID",
    status: "NEW",
    itemCount: 6,
    mrpTotal: "1777575.00",
    subtotal: "355515.00",
    savings: "1457611.50",
    discount: "35551.50",
    transportCharge: "0.00",
    gstAmount: "57593.43",
    grandTotal: "377556.93",
    couponCode: "DEEPAVALI10",
    createdAt: "2026-09-01T04:54:29.068Z",
    items: [
      { id: "prod-106", sku: "MYL-GFT-01", name: "25 Items (10pc packs)", categoryName: "Gift Boxes", packing: "1 Box", mrp: "1875.00", price: "375.00", quantity: 1, lineTotal: "375.00" },
      { id: "prod-108", sku: "MYL-GFT-03", name: "35 Items (10pc packs)", categoryName: "Gift Boxes", packing: "1 Box", mrp: "2700.00", price: "540.00", quantity: 1, lineTotal: "540.00" },
      { id: "prod-109", sku: "MYL-GFT-04", name: "42 Items (10pc packs)", categoryName: "Gift Boxes", packing: "1 Box", mrp: "4000.00", price: "800.00", quantity: 45, lineTotal: "36000.00" },
      { id: "prod-110", sku: "MYL-GFT-05", name: "50 Items (10pc packs)", categoryName: "Gift Boxes", packing: "1 Box", mrp: "5000.00", price: "1000.00", quantity: 231, lineTotal: "231000.00" },
      { id: "prod-112", sku: "MYL-GFT-07", name: "40 Items (5pc packs)", categoryName: "Gift Boxes", packing: "1 Box", mrp: "3000.00", price: "600.00", quantity: 6, lineTotal: "3600.00" },
      { id: "prod-113", sku: "MYL-GFT-08", name: "50 Items (5pc packs)", categoryName: "Gift Boxes", packing: "1 Box", mrp: "4000.00", price: "800.00", quantity: 105, lineTotal: "84000.00" },
    ],
  },
  {
    id: "est-2608-858946",
    estimateNumber: "MYL-2608-858946",
    customerName: "Kesavan Subburaj",
    mobile: "9786510405",
    email: "sujithjai007@gmail.com",
    state: "Tamil Nadu",
    district: "Virudhunagar",
    city: "Sivakasi",
    pincode: "626123",
    address: "1/394b Mela street Naranapuram, Tamil Nadu",
    transportName: "Direct Factory Transport (Sivakasi Licensed Dispatch)",
    paymentMethod: "COD",
    paymentStatus: "UNPAID",
    status: "NEW",
    itemCount: 25,
    mrpTotal: "16910.00",
    subtotal: "3382.00",
    savings: "13528.00",
    discount: "0.00",
    transportCharge: "0.00",
    gstAmount: "0.00",
    grandTotal: "3382.00",
    createdAt: "2026-09-01T01:33:00.000Z",
    items: [
      { id: "701", sku: "MYL-SND-01", name: "2 3/4\" Kuruvi", categoryName: "One Sound / 2 Sound Crackers", packing: "1 Box", mrp: "35.00", price: "7.00", quantity: 1, lineTotal: "7.00" },
      { id: "702", sku: "MYL-SND-02", name: "3 1/2\" Laxmi", categoryName: "One Sound / 2 Sound Crackers", packing: "1 Box", mrp: "60.00", price: "12.00", quantity: 1, lineTotal: "12.00" },
      { id: "703", sku: "MYL-SND-03", name: "2 Sound", categoryName: "One Sound / 2 Sound Crackers", packing: "1 Box", mrp: "120.00", price: "24.00", quantity: 3, lineTotal: "72.00" },
      { id: "704", sku: "MYL-BJL-01", name: "Stripped Bijili 100", categoryName: "Bijili Crackers", packing: "1 Bag", mrp: "80.00", price: "16.00", quantity: 1, lineTotal: "16.00" },
      { id: "705", sku: "MYL-BJL-02", name: "Red Bijili 100", categoryName: "Bijili Crackers", packing: "1 Bag", mrp: "90.00", price: "18.00", quantity: 1, lineTotal: "18.00" },
    ],
  },
  {
    id: "est-2608-708418",
    estimateNumber: "MYL-2608-708418",
    customerName: "Kesavan Subburaj",
    mobile: "9786510405",
    email: "sujithjai007@gmail.com",
    state: "Tamil Nadu",
    district: "Virudhunagar",
    city: "Sivakasi",
    pincode: "626123",
    address: "1/394b Mela street Naranapuram, Tamil Nadu",
    transportName: "Direct Factory Transport (Sivakasi Licensed Dispatch)",
    paymentMethod: "COD",
    paymentStatus: "UNPAID",
    status: "NEW",
    itemCount: 17,
    mrpTotal: "19050.30",
    subtotal: "3810.06",
    savings: "15240.24",
    discount: "0.00",
    transportCharge: "0.00",
    gstAmount: "0.00",
    grandTotal: "3810.06",
    createdAt: "2026-08-27T17:05:00.000Z",
    items: [
      { id: "801", sku: "MYL-SND-01", name: "2 3/4\" Kuruvi", categoryName: "One Sound / 2 Sound Crackers", packing: "1 Box", mrp: "35.00", price: "7.00", quantity: 1, lineTotal: "7.00" },
      { id: "802", sku: "MYL-SND-04", name: "4\" Laxmi", categoryName: "One Sound / 2 Sound Crackers", packing: "1 Box", mrp: "80.00", price: "16.00", quantity: 1, lineTotal: "16.00" },
    ],
  },
  {
    id: "est-2608-904272",
    estimateNumber: "MYL-2608-904272",
    customerName: "Jayalakshmi",
    mobile: "9042726109",
    email: "jayalakshmi@gmail.com",
    state: "Tamil Nadu",
    district: "Virudhunagar",
    city: "Sivakasi",
    pincode: "626123",
    address: "1/128 kannan Kovil Street vetrilayurani, Tamil Nadu",
    transportName: "Direct Factory Transport (Sivakasi Licensed Dispatch)",
    paymentMethod: "COD",
    paymentStatus: "UNPAID",
    status: "NEW",
    itemCount: 37,
    mrpTotal: "24255.00",
    subtotal: "4851.00",
    savings: "19404.00",
    discount: "0.00",
    transportCharge: "0.00",
    gstAmount: "0.00",
    grandTotal: "4851.00",
    createdAt: "2026-09-01T01:52:00.000Z",
    items: [
      { id: "901", sku: "MYL-SND-04", name: "4\" Laxmi", categoryName: "One Sound / 2 Sound Crackers", packing: "1 Box", mrp: "80.00", price: "16.00", quantity: 1, lineTotal: "16.00" },
      { id: "902", sku: "MYL-SND-01", name: "2 3/4\" Kuruvi", categoryName: "One Sound / 2 Sound Crackers", packing: "1 Box", mrp: "35.00", price: "7.00", quantity: 1, lineTotal: "7.00" },
      { id: "903", sku: "MYL-SND-02", name: "3 1/2\" Laxmi", categoryName: "One Sound / 2 Sound Crackers", packing: "1 Box", mrp: "60.00", price: "12.00", quantity: 1, lineTotal: "12.00" },
    ],
  },
  {
    id: "est-2608-447528",
    estimateNumber: "MYL-2608-447528",
    customerName: "KARABOO",
    mobile: "6924954585",
    email: "veggieflick@gmail.com",
    state: "Tamil Nadu",
    district: "Chennai",
    city: "Chennai",
    pincode: "600410",
    address: "sdfasfsdf sdgsdgsdg sgsfgsdgsdg sd sdgsdgsdgs sdfsdfdsfdsdf, dasdasfdsfg, Tamil Nadu, 600410",
    transportName: "Direct Factory Transport (Sivakasi Licensed Dispatch)",
    paymentMethod: "COD",
    paymentStatus: "UNPAID",
    status: "NEW",
    itemCount: 4,
    mrpTotal: "157850.00",
    subtotal: "31570.00",
    savings: "126280.00",
    discount: "0.00",
    transportCharge: "0.00",
    gstAmount: "0.00",
    grandTotal: "31570.00",
    createdAt: "2026-08-31T21:23:00.000Z",
    items: [
      { id: "601", sku: "MYL-SKY-08", name: "4\" Double Piece", categoryName: "Aerial Shots", packing: "1 Box (1 Pc)", mrp: "3950.00", price: "790.00", quantity: 29, lineTotal: "22910.00" },
      { id: "602", sku: "MYL-SKY-07", name: "4\" Glory Series", categoryName: "Aerial Shots", packing: "1 Box (1 Pc)", mrp: "2300.00", price: "460.00", quantity: 12, lineTotal: "5520.00" },
      { id: "603", sku: "MYL-SKY-06", name: "4\" Nayagara Falls", categoryName: "Aerial Shots", packing: "1 Box (1 Pc)", mrp: "2100.00", price: "420.00", quantity: 2, lineTotal: "840.00" },
      { id: "604", sku: "MYL-SKY-11", name: "Diwali Fabulous Celebration", categoryName: "Aerial Shots", packing: "1 Box (1 Pc)", mrp: "12500.00", price: "2300.00", quantity: 1, lineTotal: "2300.00" },
    ],
  },
  {
    id: "est-2608-233213",
    estimateNumber: "MYL-2608-233213",
    customerName: "THINK",
    mobile: "9874558621",
    email: "thinktamizhamedia@gmail.com",
    state: "Tamil Nadu",
    district: "Chennai",
    city: "Chennai",
    pincode: "600047",
    address: "gdfgdfgdfgdfgdf ddfdfhdfhdfhdf dfhdfgh dhhh, Tamil Nadu, 600047",
    transportName: "Direct Factory Transport (Sivakasi Licensed Dispatch)",
    paymentMethod: "COD",
    paymentStatus: "UNPAID",
    status: "NEW",
    itemCount: 2,
    mrpTotal: "294000.00",
    subtotal: "58800.00",
    savings: "235200.00",
    discount: "0.00",
    transportCharge: "0.00",
    gstAmount: "10584.00",
    grandTotal: "69384.00",
    createdAt: "2026-08-31T21:13:00.000Z",
    items: [
      { id: "501", sku: "MYL-SKY-11", name: "Diwali Fabulous Celebration (16 Shot)", categoryName: "Aerial Shots", packing: "1 Box (1 Pc)", mrp: "12500.00", price: "2500.00", quantity: 21, lineTotal: "52500.00" },
      { id: "502", sku: "MYL-SKY-06", name: "3.5\" Double Ball", categoryName: "Aerial Shots", packing: "1 Box (1 Pc)", mrp: "2100.00", price: "420.00", quantity: 15, lineTotal: "6300.00" },
    ],
  },
  {
    id: "est-2608-240944",
    estimateNumber: "MYL-2608-240944",
    customerName: "Gro You",
    mobile: "9578187822",
    email: "groyouofficial@gmail.com",
    state: "Tamil Nadu",
    district: "Chennai",
    city: "Chennai",
    pincode: "600001",
    address: "cgcghgfhgf, ch, ch, Tamil Nadu, 600001",
    transportName: "Direct Factory Transport (Sivakasi Licensed Dispatch)",
    paymentMethod: "UPI Verification",
    paymentStatus: "PAID",
    status: "PACKAGE READY",
    itemCount: 4,
    mrpTotal: "54200.00",
    subtotal: "10840.00",
    savings: "43360.00",
    discount: "1084.00",
    transportCharge: "0.00",
    gstAmount: "0.00",
    grandTotal: "9756.00",
    createdAt: "2026-08-31T20:46:00.000Z",
    items: [
      { id: "401", sku: "MYL-SND-01", name: "2 3/4\" Kuruvi", categoryName: "One Sound / 2 Sound Crackers", packing: "1 Box", mrp: "35.00", price: "7.00", quantity: 2, lineTotal: "14.00" },
      { id: "402", sku: "MYL-SKY-07", name: "4\" Glory Series", categoryName: "Aerial Shots", packing: "1 Box (1 Pc)", mrp: "2300.00", price: "460.00", quantity: 5, lineTotal: "2300.00" },
      { id: "403", sku: "MYL-MLT-01", name: "120 Shots Colour", categoryName: "Multi Shots", packing: "1 Box", mrp: "8500.00", price: "1700.00", quantity: 3, lineTotal: "5100.00" },
      { id: "404", sku: "MYL-MLT-02", name: "240 Shots Colour", categoryName: "Multi Shots", packing: "1 Box", mrp: "15000.00", price: "3000.00", quantity: 1, lineTotal: "3000.00" },
    ],
  },
  {
    id: "est-2608-281064",
    estimateNumber: "MYL-2608-281064",
    customerName: "verubhai",
    mobile: "7695916021",
    email: "sujithdon000@gmail.com",
    state: "Tamil Nadu",
    district: "Vellore",
    city: "Gudiyatham",
    pincode: "632602",
    address: "Gudi Yaththam, Gudiyatham Kurukku santhu, Tamil Nadu",
    transportName: "Direct Factory Transport (Sivakasi Licensed Dispatch)",
    paymentMethod: "UPI Verification",
    paymentStatus: "PAID",
    status: "NEW",
    itemCount: 3,
    mrpTotal: "134250.00",
    subtotal: "26850.00",
    savings: "107400.00",
    discount: "2685.00",
    transportCharge: "500.00",
    gstAmount: "4439.70",
    grandTotal: "29104.70",
    createdAt: "2026-08-31T19:55:00.000Z",
    items: [
      { id: "301", sku: "MYL-SKY-08", name: "4\" Double Piece", categoryName: "Aerial Shots", packing: "1 Box (1 Pc)", mrp: "3950.00", price: "790.00", quantity: 28, lineTotal: "22120.00" },
      { id: "302", sku: "MYL-SKY-07", name: "4\" Glory Series", categoryName: "Aerial Shots", packing: "1 Box (1 Pc)", mrp: "2300.00", price: "460.00", quantity: 10, lineTotal: "4600.00" },
      { id: "303", sku: "MYL-SKY-06", name: "3.5\" Double Ball", categoryName: "Aerial Shots", packing: "1 Box (1 Pc)", mrp: "2100.00", price: "420.00", quantity: 3, lineTotal: "1260.00" },
    ],
  },
  {
    id: "est-2608-883921",
    estimateNumber: "MYL-2608-883921",
    customerName: "Vetrivel",
    mobile: "9994948674",
    email: "vetrivel@mayiloncrackers.com",
    state: "Tamil Nadu",
    district: "Madurai",
    city: "Madurai",
    pincode: "625001",
    address: "Main Road, Madurai, Tamil Nadu - 625001",
    transportName: "Direct Factory Transport (Sivakasi Licensed Dispatch)",
    paymentMethod: "UPI Verification",
    paymentStatus: "PAID",
    status: "PACKAGE READY",
    itemCount: 3,
    mrpTotal: "32500.00",
    subtotal: "6500.00",
    savings: "26000.00",
    discount: "650.00",
    transportCharge: "250.00",
    gstAmount: "1098.00",
    grandTotal: "7198.00",
    couponCode: "DEEPAVALI10",
    createdAt: "2026-08-28T22:30:00.000Z",
    items: [
      { id: "201", sku: "MYL-SKY-07", name: "4\" Glory Series", categoryName: "Aerial Shots", packing: "1 Box", mrp: "2300.00", price: "460.00", quantity: 10, lineTotal: "4600.00" },
      { id: "202", sku: "MYL-FTN-01", name: "Magical Unicorn", categoryName: "Fountains", packing: "1 Box", mrp: "650.00", price: "130.00", quantity: 10, lineTotal: "1300.00" },
      { id: "203", sku: "MYL-GCK-01", name: "Ground Chakkar Special", categoryName: "Ground Chakkars", packing: "1 Box", mrp: "300.00", price: "60.00", quantity: 10, lineTotal: "600.00" },
    ],
  },
  {
    id: "est-2608-954766",
    estimateNumber: "MYL-2608-954766",
    customerName: "KVI",
    mobile: "9786510405",
    email: "sujithjai007@gmail.com",
    state: "Tamil Nadu",
    district: "Chennai",
    city: "Velachery, Chennai",
    pincode: "600042",
    address: "Velachery , Chennai, Tamil Nadu",
    transportName: "Direct Factory Transport (Sivakasi Licensed Dispatch)",
    paymentMethod: "UPI Verification",
    paymentStatus: "PAID",
    status: "SHIPPED",
    itemCount: 4,
    mrpTotal: "42000.00",
    subtotal: "8400.00",
    savings: "33600.00",
    discount: "840.00",
    transportCharge: "350.00",
    gstAmount: "1339.92",
    grandTotal: "9249.92",
    couponCode: "DEEPAVALI10",
    createdAt: "2026-08-28T18:13:00.000Z",
    items: [
      { id: "101", sku: "MYL-SND-01", name: "2 3/4\" Kuruvi", categoryName: "One Sound / 2 Sound Crackers", packing: "1 Box", mrp: "35.00", price: "7.00", quantity: 1, lineTotal: "7.00" },
      { id: "102", sku: "MYL-SND-02", name: "3 1/2\" Laxmi", categoryName: "One Sound / 2 Sound Crackers", packing: "1 Box", mrp: "60.00", price: "12.00", quantity: 21, lineTotal: "252.00" },
      { id: "103", sku: "MYL-MLT-01", name: "120 Shots Colour", categoryName: "Multi Shots", packing: "1 Box", mrp: "8500.00", price: "1700.00", quantity: 3, lineTotal: "5100.00" },
      { id: "104", sku: "MYL-MLT-02", name: "240 Shots Colour", categoryName: "Multi Shots", packing: "1 Box", mrp: "15000.00", price: "3000.00", quantity: 1, lineTotal: "3000.00" },
    ],
  },
  {
    id: "est-2608-905083",
    estimateNumber: "MYL-2608-905083",
    customerName: "SUJIT",
    mobile: "8667038564",
    email: "sujit@gmail.com",
    state: "Tamil Nadu",
    district: "Chennai",
    city: "Chennai",
    pincode: "600100",
    address: "ffdfsdf, Chennai, Chennai, Tamil Nadu, 600100",
    transportName: "Direct Factory Transport (Sivakasi Licensed Dispatch)",
    paymentMethod: "COD",
    paymentStatus: "UNPAID",
    status: "NEW",
    itemCount: 5,
    mrpTotal: "71325.00",
    subtotal: "14265.00",
    savings: "58486.50",
    discount: "1426.50",
    transportCharge: "449.35",
    gstAmount: "2310.93",
    grandTotal: "15598.78",
    couponCode: "DEEPAVALI10",
    createdAt: "2026-08-28T09:50:00.000Z",
    items: [
      { id: "1", sku: "MYL-SKY-07", name: "4\" Glory Series", categoryName: "Aerial Shots", packing: "1 Box (1 Pc)", mrp: "2300.00", price: "460.00", quantity: 15, lineTotal: "6900.00" },
      { id: "2", sku: "MYL-SKY-06", name: "3.5\" Double Ball", categoryName: "Aerial Shots", packing: "1 Box (1 Pc)", mrp: "2100.00", price: "420.00", quantity: 6, lineTotal: "2520.00" },
      { id: "3", sku: "MYL-SKY-05", name: "3.5\" Knight Series (2 Pc)", categoryName: "Aerial Shots", packing: "1 Box (2 Pcs)", mrp: "2625.00", price: "525.00", quantity: 6, lineTotal: "3150.00" },
      { id: "4", sku: "MYL-SKY-04", name: "3.5\" Single Smash", categoryName: "Aerial Shots", packing: "1 Box (1 Pc)", mrp: "1575.00", price: "315.00", quantity: 3, lineTotal: "945.00" },
      { id: "5", sku: "MYL-SKY-03", name: "2\" Fancy (3 Pc)", categoryName: "Aerial Shots", packing: "1 Box (3 Pcs)", mrp: "1250.00", price: "250.00", quantity: 3, lineTotal: "750.00" },
    ],
  },
];

type GlobalWithOrders = typeof globalThis & {
  __mayilonOrdersStore?: Map<string, OrderRecord>;
};

const g = globalThis as GlobalWithOrders;
if (!g.__mayilonOrdersStore) {
  g.__mayilonOrdersStore = new Map<string, OrderRecord>();
  // Pre-fill from persistent disk file or initial seed orders
  const saved = syncFileLoad();
  const initial = saved.length > 0 ? saved : INITIAL_SEED_ORDERS;
  for (const item of initial) {
    if (item && item.estimateNumber) {
      g.__mayilonOrdersStore.set(item.estimateNumber, item);
    }
  }
}

const STORE = g.__mayilonOrdersStore;

/** Save order to universal store and disk backup */
export function saveOrderToStore(order: OrderRecord): OrderRecord {
  const existing = STORE.get(order.estimateNumber);
  const finalOrder: OrderRecord = {
    ...order,
    createdAt: existing?.createdAt || order.createdAt || new Date().toISOString(),
  };
  STORE.set(finalOrder.estimateNumber, finalOrder);
  syncFileSave(Array.from(STORE.values()));
  return finalOrder;
}

/** Retrieve order by estimate number */
export function getOrderFromStore(estimateNumber: string): OrderRecord | undefined {
  return STORE.get(estimateNumber);
}

/** Get all orders for Admin portal (sorted newest first) */
export function getAllOrdersFromStore(): OrderRecord[] {
  return Array.from(STORE.values()).sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
  );
}

/** Update order status in store without clearing order history or date */
export function updateOrderStatusInStore(
  estimateNumber: string,
  patch: Partial<Pick<OrderRecord, "status" | "paymentStatus" | "paymentMethod">>,
): OrderRecord | undefined {
  const existing = STORE.get(estimateNumber);
  if (!existing) return undefined;

  const updated: OrderRecord = {
    ...existing,
    ...patch,
    createdAt: existing.createdAt || new Date().toISOString(),
  };
  STORE.set(estimateNumber, updated);
  syncFileSave(Array.from(STORE.values()));
  return updated;
}
