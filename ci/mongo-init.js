db.planets.deleteMany({});

db.planets.insertMany([
    {
        id: 1,
        name: "Mercury",
        description: "The smallest planet and the closest to the Sun."
    },
    {
        id: 2,
        name: "Venus",
        description: "The hottest planet in the Solar System."
    },
    {
        id: 3,
        name: "Earth",
        description: "Our home planet."
    },
    {
        id: 4,
        name: "Mars",
        description: "The red planet."
    },
    {
        id: 5,
        name: "Jupiter",
        description: "The largest planet in the Solar System."
    },
    {
        id: 6,
        name: "Saturn",
        description: "A gas giant known for its rings."
    },
    {
        id: 7,
        name: "Uranus",
        description: "An ice giant that rotates on its side."
    },
    {
        id: 8,
        name: "Neptune",
        description: "The farthest major planet from the Sun."
    }
]);
