
    // -----------------------------
    // Demo Data
    // -----------------------------
    const CITIES = ["Dhaka", "Chattogram", "Sylhet", "Rajshahi", "Khulna", "Barishal", "Rangpur", "Cox's Bazar"];
    const TIMES = ["07:00 AM", "09:00 AM", "12:00 PM", "03:00 PM", "06:00 PM", "09:00 PM", "11:30 PM"];

    // Route base fares (per seat) in BDT (demo numbers)
    const ROUTE_FARES = {
      "Dhaka|Chattogram": 900,
      "Dhaka|Sylhet": 850,
      "Dhaka|Rajshahi": 800,
      "Dhaka|Khulna": 850,
      "Dhaka|Barishal": 550,
      "Dhaka|Rangpur": 750,
      "Dhaka|Saidpur": 900,
      "Dhaka|Nilphamari": 950,
      "Dhaka|Domar": 1050,
      "Dhaka|Shibchar":400,
      "Dhaka|Sirajganj": 250,
      "Dhaka|Cox's Bazar": 1200,
      "Chattogram|Cox's Bazar": 450,
      "Sylhet|Chattogram": 1100
    };

    const COACH_MULTIPLIER = {
      "Non-AC": 1.0,
      "AC": 1.25,
      "Sleeper": 1.6
    };

 