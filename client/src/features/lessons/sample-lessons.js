// Sample lessons for the lesson library, written for SA Educate (original text, not copied from any textbook),
// so the library has real content to open and turn into practice questions.
export const TEXTBOOK = 'SA Educate Open Textbook (sample lessons)';

export const SAMPLE_LESSONS = {
  Mathematics: [
    {
      id: 'maths-fractions', grade: 7, chapter: 4, title: 'Fractions and equivalent fractions',
      text: `A fraction describes part of a whole that has been divided into equal parts. In the fraction 3/4, the bottom number is called the denominator and the top number is called the numerator. The denominator tells us how many equal parts the whole is divided into. The numerator tells us how many of those parts we are talking about.

Two fractions are equivalent when they describe the same amount. For example, 1/2, 2/4 and 4/8 are equivalent fractions. To make an equivalent fraction, multiply or divide the numerator and the denominator by the same number. Multiplying both parts of 2/3 by 5 gives 10/15, which is the same amount.

A fraction is in its simplest form when the numerator and denominator have no common factor other than 1. To simplify 12/18, divide both numbers by their highest common factor, which is 6. This gives 2/3.

To compare fractions with different denominators, first write them with a common denominator. To compare 3/5 and 2/3, write them as 9/15 and 10/15. Because 10/15 is larger, 2/3 is larger than 3/5.`,
    },
    {
      id: 'maths-linear-equations', grade: 9, chapter: 6, title: 'Solving linear equations',
      text: `An equation is a mathematical statement that two expressions are equal. A linear equation contains a variable, such as x, that is not raised to any power higher than one. Solving an equation means finding the value of the variable that makes the statement true.

The golden rule of equations is that whatever you do to one side, you must also do to the other side. This keeps the equation balanced, like a scale.

To solve x + 7 = 12, subtract 7 from both sides. This leaves x = 5. To solve 3x = 21, divide both sides by 3, which gives x = 7. Many equations need more than one step. To solve 2x + 5 = 17, first subtract 5 from both sides to get 2x = 12, and then divide both sides by 2 to get x = 6.

Always check your answer by substituting it back into the original equation. If x = 6, then 2(6) + 5 = 17, so the solution is correct.

Linear equations help us solve everyday problems. If a taxi trip costs R15 plus R8 per kilometre, and the total cost was R55, the equation 15 + 8k = 55 shows that the trip was 5 kilometres long.`,
    },
  ],
  'Physical Sciences': [
    {
      id: 'phys-states-of-matter', grade: 10, chapter: 2, title: 'States of matter and the kinetic molecular theory',
      text: `Matter is anything that has mass and takes up space. On Earth, matter is commonly found in three states: solid, liquid and gas.

The kinetic molecular theory explains the behaviour of matter. It states that all matter is made of tiny particles that are always moving, and that there are forces of attraction between these particles. The faster the particles move, the more kinetic energy they have, and the higher the temperature.

In a solid, the particles are packed closely together in a fixed pattern. They vibrate in place but cannot move past each other, so a solid has a fixed shape and a fixed volume. In a liquid, the particles are still close together but they can slide past one another. A liquid has a fixed volume but takes the shape of its container. In a gas, the particles are far apart and move freely in all directions. A gas has no fixed shape or volume and fills any container.

When a substance is heated, its particles gain energy. Melting is the change from solid to liquid, and boiling is the change from liquid to gas. When a gas cools, it condenses into a liquid, and when a liquid cools enough, it freezes into a solid.`,
    },
    {
      id: 'phys-electric-circuits', grade: 9, chapter: 8, title: 'Electric circuits',
      text: `An electric circuit is a closed path along which an electric current can flow. A simple circuit needs a source of energy, such as a cell or battery, conducting wires, and a component that uses the energy, such as a light bulb. A switch can open or close the circuit.

Electric current is the rate at which charge flows through a conductor. It is measured in amperes (A) using an ammeter, which is connected in series. Potential difference, also called voltage, is the energy transferred per unit of charge. It is measured in volts (V) using a voltmeter, which is connected in parallel across a component.

Resistance opposes the flow of current and is measured in ohms. A thin, long wire has more resistance than a thick, short wire made of the same material.

In a series circuit, components are connected one after another, so the same current flows through each of them. If one bulb in a series circuit breaks, the whole circuit stops working. In a parallel circuit, components are connected on separate branches. If one bulb breaks, the bulbs on the other branches keep working. This is why the lights in a house are connected in parallel.`,
    },
  ],
  'Business Studies': [
    {
      id: 'bus-environments', grade: 10, chapter: 1, title: 'The three business environments',
      text: `Every business operates within an environment that affects how it performs. Business Studies divides this into three environments: the micro environment, the market environment and the macro environment.

The micro environment is the business itself. It includes the business's vision, mission, management, employees, resources and the eight business functions, such as the purchasing, marketing and financial functions. The business has full control over its micro environment.

The market environment is found directly outside the business. It includes consumers, suppliers, competitors and intermediaries such as wholesalers and retailers. The business has only some control over this environment. For example, it can try to win customers with good prices and service, but it cannot control what competitors do.

The macro environment includes the wider forces that affect all businesses. These include the economy, laws and politics, technology, society and the natural environment. A business has no control over its macro environment. For example, if the interest rate rises or a new law is passed, the business must adapt.

Businesses study all three environments so that they can find opportunities, reduce threats and plan for the future.`,
    },
    {
      id: 'bus-entrepreneurship', grade: 10, chapter: 5, title: 'Entrepreneurship',
      text: `An entrepreneur is a person who identifies a business opportunity and is willing to take a risk to turn it into a business. Entrepreneurs combine the factors of production, namely natural resources, labour and capital, to produce goods or services that people need.

Successful entrepreneurs usually share certain qualities. They are creative and able to come up with new ideas. They are willing to take calculated risks, and they are persistent when things do not go as planned. They are also good at planning and at managing their time and money.

Entrepreneurship is important for South Africa's economy. New businesses create jobs, which helps to reduce unemployment. They also bring new products and services to communities and pay taxes that the government can use to provide services.

Before starting a business, an entrepreneur should write a business plan. A business plan describes the product or service, the target market, the competitors, how the business will be marketed and how much money is needed to start it. A good business plan helps the entrepreneur to think carefully about the idea and can be used to apply for a loan.`,
    },
  ],
  Geography: [
    {
      id: 'geo-water-cycle', grade: 7, chapter: 3, title: 'The water cycle',
      text: `Water is always moving between the land, the oceans and the atmosphere. This continuous movement is called the water cycle, or the hydrological cycle. The energy that drives the water cycle comes from the sun.

The sun heats water in oceans, rivers and dams. Some of this water changes into water vapour and rises into the air. This process is called evaporation. Plants also release water vapour through their leaves, which is called transpiration.

As the water vapour rises, it cools. The cooled vapour changes back into tiny water droplets that form clouds. This process is called condensation.

When the droplets in a cloud join together and become heavy, they fall to the ground as rain, hail or snow. This is called precipitation. Most of South Africa receives its rain in summer, but the Western Cape receives most of its rain in winter.

Some of the water that reaches the ground flows over the surface into streams and rivers. This is called run-off. Some of the water soaks into the soil and becomes groundwater. Eventually the water returns to the oceans, and the cycle begins again.`,
    },
    {
      id: 'geo-weather-climate', grade: 8, chapter: 2, title: 'Weather and climate',
      text: `Weather and climate both describe the atmosphere, but they are not the same. Weather is the condition of the atmosphere at a particular place and time. It can change from hour to hour. Climate is the average weather of a place, measured over a long period of usually thirty years or more.

The main elements of weather are temperature, rainfall, wind, humidity and air pressure. Temperature is measured with a thermometer, rainfall with a rain gauge, and wind speed with an anemometer. Air pressure is measured with a barometer.

Several factors influence the climate of a place. Places closer to the equator are generally warmer than places closer to the poles. Places at a higher altitude are cooler than places at sea level, which is why Johannesburg, on the Highveld, has cooler nights than Durban on the coast. Ocean currents also play a role. The warm Agulhas Current makes the east coast of South Africa warm and humid, while the cold Benguela Current makes the west coast cool and dry.

Understanding weather and climate helps farmers to plan their planting and helps communities to prepare for droughts and floods.`,
    },
  ],
  'Life Sciences': [
    {
      id: 'life-human-eye', grade: 12, chapter: 4, title: 'The human eye',
      text: `The eye is the sense organ that allows us to see. It detects light and changes it into nerve impulses that are sent to the brain.

Light first passes through the cornea, the transparent front part of the eye. The cornea refracts, or bends, the light. The light then passes through the pupil, which is the opening in the middle of the iris. The iris is the coloured part of the eye, and its muscles control the size of the pupil. In bright light the pupil becomes smaller, so that less light enters the eye. In dim light the pupil becomes larger.

Behind the pupil is the lens. The lens changes its shape to focus light onto the retina at the back of the eye. This process is called accommodation. The retina contains light-sensitive cells called rods and cones. Rods allow us to see in dim light, while cones allow us to see colour. The optic nerve carries the impulses from the retina to the brain.

Several defects can affect vision. Short-sightedness happens when the eyeball is too long and is corrected with concave lenses. Long-sightedness happens when the eyeball is too short and is corrected with convex lenses. Astigmatism is caused by an uneven curvature of the cornea or lens, which makes the image blurred.`,
    },
    {
      id: 'life-photosynthesis', grade: 10, chapter: 7, title: 'Photosynthesis',
      text: `Photosynthesis is the process by which green plants make their own food. Plants use light energy from the sun to change carbon dioxide and water into glucose and oxygen.

Photosynthesis takes place mainly in the leaves, inside structures called chloroplasts. Chloroplasts contain a green pigment called chlorophyll, which absorbs light energy. This is why leaves are green.

Plants take in carbon dioxide from the air through small openings in their leaves called stomata. Water is absorbed from the soil by the roots and carried up to the leaves through the xylem. The glucose that is made is used by the plant for energy and growth, or it is stored as starch. The oxygen is released into the air through the stomata.

The rate of photosynthesis depends on several factors. It increases when there is more light, more carbon dioxide or a suitable temperature. If one of these factors is in short supply, it limits how fast photosynthesis can take place.

Photosynthesis is important for all life on Earth. It provides the oxygen that animals and people breathe, and the food it produces is the start of almost every food chain.`,
    },
  ],
  'Visual Arts': [
    {
      id: 'art-elements', grade: 10, chapter: 1, title: 'The elements of art',
      text: `The elements of art are the basic building blocks that artists use to create a work of art. The seven elements are line, shape, form, space, colour, value and texture.

Line is a mark that connects two points. Lines can be straight or curved, thick or thin, and they can lead the viewer's eye around an artwork. Shape is a flat, enclosed area with two dimensions, such as a circle or a square. Form is three-dimensional and has length, width and depth, like a sculpture or a drawing of a cube that has been shaded to look solid.

Space is the area around and between objects in an artwork. Artists create the illusion of depth by making objects in the distance smaller and placing them higher on the page. Value describes how light or dark a colour is. Strong differences in value create contrast and drama.

Colour has three properties: hue, which is the name of the colour; value; and intensity, which is how bright or dull the colour is. Texture is the way a surface feels, or looks as if it would feel. Real texture can be touched, while implied texture is created by the artist to look rough or smooth.`,
    },
    {
      id: 'art-colour-theory', grade: 10, chapter: 2, title: 'Colour theory',
      text: `Colour theory helps artists to understand how colours work together. The colour wheel arranges colours in a circle to show the relationships between them.

The primary colours are red, yellow and blue. They cannot be made by mixing other colours. When two primary colours are mixed, they make a secondary colour. Red and yellow make orange, yellow and blue make green, and blue and red make purple. Mixing a primary colour with the secondary colour next to it makes a tertiary colour, such as blue-green.

Complementary colours are found opposite each other on the colour wheel, such as red and green, or blue and orange. When they are placed next to each other, they make each other look brighter, which creates strong contrast. Analogous colours sit next to each other on the colour wheel, such as yellow, yellow-orange and orange. They create a calm and harmonious feeling.

Colours can also be described as warm or cool. Warm colours such as red, orange and yellow seem to come forward in a painting and suggest energy and heat. Cool colours such as blue, green and purple seem to move back and suggest calm and distance.`,
    },
  ],
};

export const allSampleLessons = () => Object.entries(SAMPLE_LESSONS).flatMap(([subject, lessons]) => lessons.map(lesson => ({ ...lesson, subject })));
