/* Knowledge base: maps each class of the model to a crop and a problem category,
   and holds general, non-chemical guidance per category in 3 languages.
   Guidance is general by design: no pesticide names or doses are given. */
(function (root) {
  "use strict";

  // Crop names (translated). Disease names are never translated.
  const CROPS = {
    apple:{en:"Apple",mr:"सफरचंद",hi:"सेब"}, blueberry:{en:"Blueberry",mr:"ब्लूबेरी",hi:"ब्लूबेरी"},
    cherry:{en:"Cherry",mr:"चेरी",hi:"चेरी"}, corn:{en:"Corn (maize)",mr:"मका",hi:"मक्का"},
    grape:{en:"Grape",mr:"द्राक्ष",hi:"अंगूर"}, orange:{en:"Orange",mr:"संत्रा",hi:"संतरा"},
    peach:{en:"Peach",mr:"पीच",hi:"आड़ू"}, pepper:{en:"Bell pepper",mr:"ढोबळी मिरची",hi:"शिमला मिर्च"},
    potato:{en:"Potato",mr:"बटाटा",hi:"आलू"}, raspberry:{en:"Raspberry",mr:"रास्पबेरी",hi:"रास्पबेरी"},
    soybean:{en:"Soybean",mr:"सोयाबीन",hi:"सोयाबीन"}, squash:{en:"Squash",mr:"स्क्वॅश (भोपळावर्गीय)",hi:"स्क्वैश (कद्दू वर्गीय)"},
    strawberry:{en:"Strawberry",mr:"स्ट्रॉबेरी",hi:"स्ट्रॉबेरी"}, tomato:{en:"Tomato",mr:"टोमॅटो",hi:"टमाटर"}
  };

  // [raw class label from the model, crop key, category]
  const ENTRIES = [
    ["Apple___Apple_scab","apple","fungal"],["Apple___Black_rot","apple","fungal"],
    ["Apple___Cedar_apple_rust","apple","fungal"],["Apple___healthy","apple","healthy"],
    ["Blueberry___healthy","blueberry","healthy"],
    ["Cherry_(including_sour)___Powdery_mildew","cherry","fungal"],["Cherry_(including_sour)___healthy","cherry","healthy"],
    ["Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot","corn","fungal"],["Corn_(maize)___Common_rust_","corn","fungal"],
    ["Corn_(maize)___Northern_Leaf_Blight","corn","fungal"],["Corn_(maize)___healthy","corn","healthy"],
    ["Grape___Black_rot","grape","fungal"],["Grape___Esca_(Black_Measles)","grape","fungal"],
    ["Grape___Leaf_blight_(Isariopsis_Leaf_Spot)","grape","fungal"],["Grape___healthy","grape","healthy"],
    ["Orange___Haunglongbing_(Citrus_greening)","orange","citrus"],
    ["Peach___Bacterial_spot","peach","bacterial"],["Peach___healthy","peach","healthy"],
    ["Pepper,_bell___Bacterial_spot","pepper","bacterial"],["Pepper,_bell___healthy","pepper","healthy"],
    ["Potato___Early_blight","potato","fungal"],["Potato___Late_blight","potato","fungal"],["Potato___healthy","potato","healthy"],
    ["Raspberry___healthy","raspberry","healthy"],["Soybean___healthy","soybean","healthy"],
    ["Squash___Powdery_mildew","squash","fungal"],
    ["Strawberry___Leaf_scorch","strawberry","fungal"],["Strawberry___healthy","strawberry","healthy"],
    ["Tomato___Bacterial_spot","tomato","bacterial"],["Tomato___Early_blight","tomato","fungal"],
    ["Tomato___Late_blight","tomato","fungal"],["Tomato___Leaf_Mold","tomato","fungal"],
    ["Tomato___Septoria_leaf_spot","tomato","fungal"],["Tomato___Spider_mites Two-spotted_spider_mite","tomato","mite"],
    ["Tomato___Target_Spot","tomato","fungal"],["Tomato___Tomato_Yellow_Leaf_Curl_Virus","tomato","viral"],
    ["Tomato___Tomato_mosaic_virus","tomato","viral"],["Tomato___healthy","tomato","healthy"]
  ];

  // Normalise labels so small formatting differences (case, underscores, spaces) still match.
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
  const INDEX = {};
  ENTRIES.forEach(([raw, crop, cat]) => { INDEX[norm(raw)] = { raw, crop, cat }; });

  /** Look up a raw model label. Returns display info; never invents a crop. */
  function lookup(rawLabel) {
    const parts = String(rawLabel).split("___");
    const diseaseRaw = (parts[1] || parts[0] || "").replace(/_/g, " ").replace(/\s+/g, " ").trim();
    const hit = INDEX[norm(rawLabel)];
    return {
      raw: rawLabel,
      known: !!hit,
      crop: hit ? hit.crop : null,
      cat: hit ? hit.cat : "unknown",
      isHealthy: hit ? hit.cat === "healthy" : /healthy/i.test(diseaseRaw),
      diseaseName: diseaseRaw,                    // shown exactly as given by the model
      cropNameRaw: (parts[0] || "").replace(/_/g, " ").trim()
    };
  }

  // General guidance per category. No pesticide names or doses.
  const GUIDE = {
    fungal: {
      en: {
        symptoms: ["Spots, patches or coloured areas on leaves, often brown, yellow or grey.","Spots may grow, join together or show rings; some diseases show a powdery or mouldy coating.","Badly affected leaves may dry up and fall. The exact signs differ from disease to disease."],
        causes: ["Fungi or fungus-like organisms that spread by spores through wind, rain splash, tools and infected plant waste.","Warm, humid or wet weather, leaves staying wet for long, and crowded plants help the disease spread."],
        steps: ["Check nearby plants for similar signs and note how many are affected.","If practical, remove the worst affected leaves and dispose of them away from the field.","Avoid working among wet plants and clean your tools after use.","Take clear photos over the next few days to see whether it is spreading, and show them to your local agriculture officer or KVK.","Ask the expert which treatment, if any, is approved for your crop and region before using any spray."],
        prevention: ["Use healthy seed or seedlings and rotate crops.","Give plants enough space for air to move.","Water at the base of the plant, preferably in the morning, and avoid keeping leaves wet.","Remove old crop residue and weeds after harvest."]
      },
      mr: {
        symptoms: ["पानांवर डाग, ठिपके किंवा रंग बदललेले भाग, बहुतेक वेळा तपकिरी, पिवळे किंवा राखाडी.","डाग वाढू शकतात, एकमेकांत मिसळू शकतात किंवा त्यांच्याभोवती कडी दिसू शकतात; काही रोगांत पानावर पावडरसारखा किंवा बुरशीसारखा थर दिसतो.","जास्त बाधित पाने सुकून गळू शकतात. नेमकी लक्षणे रोगानुसार वेगळी असतात."],
        causes: ["बुरशी किंवा बुरशीसारखे सूक्ष्मजीव; त्यांचे बीजाणू वारा, पावसाचे थेंब, अवजारे आणि रोगट पालापाचोळा यांच्याद्वारे पसरतात.","उबदार, दमट किंवा ओले हवामान, पाने जास्त वेळ ओली राहणे आणि झाडे दाटीवाटीने असणे यामुळे रोग पसरतो."],
        steps: ["जवळच्या झाडांवर अशीच लक्षणे आहेत का ते पाहा आणि किती झाडे बाधित आहेत ते नोंदवा.","शक्य असल्यास सर्वात जास्त बाधित पाने काढून शेतापासून दूर नष्ट करा.","ओल्या झाडांमध्ये काम करणे टाळा आणि वापरानंतर अवजारे स्वच्छ करा.","पुढील काही दिवस स्पष्ट फोटो घ्या, रोग पसरतो का ते पाहा आणि तुमचे कृषी अधिकारी किंवा KVK यांना दाखवा.","कोणतीही फवारणी करण्यापूर्वी, तुमच्या पिकासाठी आणि भागासाठी कोणता उपचार (असल्यास) मान्य आहे ते तज्ज्ञांना विचारा."],
        prevention: ["निरोगी बियाणे किंवा रोपे वापरा आणि पिकांची फेरपालट करा.","झाडांमध्ये हवा खेळती राहील इतकी जागा ठेवा.","झाडाच्या बुंध्याजवळ, शक्यतो सकाळी पाणी द्या आणि पाने ओली राहू देऊ नका.","काढणीनंतर जुना पीक-अवशेष आणि तण काढून टाका."]
      },
      hi: {
        symptoms: ["पत्तियों पर धब्बे, दाग या रंग बदले हिस्से, अक्सर भूरे, पीले या स्लेटी।","धब्बे बढ़ सकते हैं, आपस में मिल सकते हैं या उनमें छल्ले दिख सकते हैं; कुछ रोगों में पत्ती पर पाउडर जैसी या फफूंद जैसी परत दिखती है।","ज़्यादा प्रभावित पत्तियां सूखकर गिर सकती हैं। सही लक्षण रोग के अनुसार अलग होते हैं।"],
        causes: ["फफूंद या फफूंद जैसे सूक्ष्मजीव; इनके बीजाणु हवा, बारिश की छींटों, औज़ारों और रोगी पौध-अवशेष से फैलते हैं।","गर्म, नम या गीला मौसम, पत्तियों का देर तक गीला रहना और पौधों की घनी बुवाई से रोग फैलता है।"],
        steps: ["आसपास के पौधों में ऐसे ही लक्षण देखें और कितने पौधे प्रभावित हैं यह नोट करें।","संभव हो तो सबसे ज़्यादा प्रभावित पत्तियां तोड़कर खेत से दूर नष्ट करें।","गीले पौधों के बीच काम करने से बचें और उपयोग के बाद औज़ार साफ़ करें।","अगले कुछ दिन साफ़ फोटो लें, देखें कि रोग फैल रहा है या नहीं, और अपने कृषि अधिकारी या KVK को दिखाएं।","कोई भी छिड़काव करने से पहले विशेषज्ञ से पूछें कि आपकी फसल और क्षेत्र के लिए कौन सा उपचार (यदि कोई) मान्य है।"],
        prevention: ["स्वस्थ बीज या पौध लें और फसल चक्र अपनाएं।","पौधों के बीच इतनी जगह रखें कि हवा आती-जाती रहे।","पौधे की जड़ के पास, बेहतर है सुबह, पानी दें और पत्तियों को गीला न रहने दें।","कटाई के बाद पुराने फसल-अवशेष और खरपतवार हटा दें।"]
      }
    },

    bacterial: {
      en: {
        symptoms: ["Small, dark or water-soaked spots on leaves, often with a yellow edge.","Spots can look angular or may dry and tear, leaving holes.","Spots may also appear on fruit or stems in some crops."],
        causes: ["Bacteria that spread by splashing rain or irrigation water, contaminated seed or seedlings, and tools or hands.","Warm, wet and windy weather helps the spread."],
        steps: ["Avoid touching or working among wet plants, so the bacteria are not carried to healthy ones.","If practical, remove the worst affected leaves and dispose of them away from the field.","Avoid overhead watering and clean tools and hands after handling affected plants.","Take clear photos over several days and show them to your local agriculture officer or KVK.","Ask the expert which treatment, if any, is approved for your crop and region. Do not use any spray without expert advice."],
        prevention: ["Use clean, healthy seed and seedlings from a reliable source.","Rotate crops and remove crop residue after harvest.","Water at the base of the plant and avoid wetting the leaves.","Disinfect tools regularly."]
      },
      mr: {
        symptoms: ["पानांवर लहान, गडद किंवा पाणथळ दिसणारे डाग, अनेकदा कडेला पिवळसर रेषा.","डाग कोनदार दिसू शकतात किंवा सुकून फाटून छिद्रे पडू शकतात.","काही पिकांत फळे किंवा खोडावरही डाग दिसू शकतात."],
        causes: ["जिवाणू; ते पावसाचे किंवा पाटपाण्याचे थेंब उडून, दूषित बियाणे/रोपे, तसेच अवजारे आणि हातांद्वारे पसरतात.","उबदार, ओले आणि वाऱ्याचे हवामान प्रसारास मदत करते."],
        steps: ["ओल्या झाडांना हात लावणे किंवा त्यांच्यात काम करणे टाळा, म्हणजे जिवाणू निरोगी झाडांपर्यंत जाणार नाहीत.","शक्य असल्यास सर्वात जास्त बाधित पाने काढून शेतापासून दूर नष्ट करा.","वरून पाणी देणे टाळा; बाधित झाडे हाताळल्यानंतर अवजारे आणि हात स्वच्छ करा.","अनेक दिवस स्पष्ट फोटो घ्या आणि कृषी अधिकारी किंवा KVK यांना दाखवा.","तुमच्या पिकासाठी आणि भागासाठी कोणता उपचार (असल्यास) मान्य आहे ते तज्ज्ञांना विचारा. तज्ज्ञांच्या सल्ल्याशिवाय कोणतीही फवारणी करू नका."],
        prevention: ["विश्वासार्ह ठिकाणाहून स्वच्छ, निरोगी बियाणे आणि रोपे घ्या.","पिकांची फेरपालट करा आणि काढणीनंतर पीक-अवशेष काढून टाका.","झाडाच्या बुंध्याजवळ पाणी द्या; पाने ओली करू नका.","अवजारे नियमित निर्जंतुक करा."]
      },
      hi: {
        symptoms: ["पत्तियों पर छोटे, गहरे या पानी से भीगे जैसे धब्बे, अक्सर किनारे पर पीलापन।","धब्बे कोणदार दिख सकते हैं या सूखकर फट सकते हैं और छेद बन सकते हैं।","कुछ फसलों में फल या तने पर भी धब्बे दिख सकते हैं।"],
        causes: ["जीवाणु; ये बारिश या सिंचाई के पानी की छींटों, दूषित बीज/पौध, तथा औज़ारों और हाथों से फैलते हैं।","गर्म, गीला और हवादार मौसम फैलाव में मदद करता है।"],
        steps: ["गीले पौधों को छूने या उनके बीच काम करने से बचें, ताकि जीवाणु स्वस्थ पौधों तक न पहुंचें।","संभव हो तो सबसे ज़्यादा प्रभावित पत्तियां तोड़कर खेत से दूर नष्ट करें।","ऊपर से पानी देने से बचें; प्रभावित पौधे छूने के बाद औज़ार और हाथ साफ़ करें।","कई दिन साफ़ फोटो लें और कृषि अधिकारी या KVK को दिखाएं।","विशेषज्ञ से पूछें कि आपकी फसल और क्षेत्र के लिए कौन सा उपचार (यदि कोई) मान्य है। विशेषज्ञ की सलाह के बिना कोई छिड़काव न करें।"],
        prevention: ["भरोसेमंद स्रोत से साफ़, स्वस्थ बीज और पौध लें।","फसल चक्र अपनाएं और कटाई के बाद फसल-अवशेष हटा दें।","पौधे की जड़ के पास पानी दें; पत्तियों को गीला न करें।","औज़ारों को नियमित रूप से कीटाणुरहित करें।"]
      }
    },

    citrus: {
      en: {
        symptoms: ["Yellowing of shoots and blotchy, mottled leaves that do not match normal nutrient problems.","Small, lopsided fruit that may stay green at the bottom and taste bitter.","Branches may die back and the tree becomes weak over time."],
        causes: ["A bacterium spread by a small sap-sucking insect (citrus psyllid) and by infected plant material such as grafts and saplings.","Once a tree is infected, it generally cannot be cured."],
        steps: ["This is a serious disease. Contact your agriculture or horticulture department officer or KVK soon, and show them this photo.","Do not move cuttings, grafts or saplings from this tree to other places.","Mark the tree and watch nearby trees for similar signs.","Follow the expert’s advice on managing the tree and the insect."],
        prevention: ["Plant only certified, disease-free saplings.","Watch for the insect and manage it as advised by experts.","Keep orchard sanitation good and report suspected cases early."]
      },
      mr: {
        symptoms: ["कोंब पिवळे पडणे आणि पानांवर ठिपकेदार/चट्टेदार रंग; हे नेहमीच्या अन्नद्रव्य कमतरतेसारखे नसते.","लहान, वाकडी फळे; तळाशी हिरवी राहू शकतात आणि चव कडू असू शकते.","फांद्या मरू शकतात आणि झाड हळूहळू कमजोर होते."],
        causes: ["रस शोषणारी लहान कीड (सिट्रस सायला) आणि कलमे, रोपे यांसारख्या रोगट वनस्पती-साहित्यामार्फत पसरणारा जिवाणू.","झाडाला एकदा लागण झाली की ते सहसा बरे होत नाही."],
        steps: ["हा गंभीर रोग आहे. लवकरच तुमचे कृषी/फलोत्पादन विभागाचे अधिकारी किंवा KVK यांच्याशी संपर्क करा आणि हा फोटो दाखवा.","या झाडाची काडी, कलमे किंवा रोपे इतरत्र नेऊ नका.","झाडावर खूण करा आणि जवळच्या झाडांवर अशी लक्षणे आहेत का ते पाहा.","झाडाचे आणि किडीचे व्यवस्थापन कसे करावे याबाबत तज्ज्ञांचा सल्ला पाळा."],
        prevention: ["फक्त प्रमाणित, रोगमुक्त रोपे लावा.","किडीवर लक्ष ठेवा आणि तज्ज्ञांच्या सल्ल्यानुसार तिचे व्यवस्थापन करा.","बागेची स्वच्छता ठेवा आणि संशयित प्रकरणे लवकर कळवा."]
      },
      hi: {
        symptoms: ["टहनियों का पीला पड़ना और पत्तियों पर चितकबरे/धब्बेदार रंग; यह सामान्य पोषक तत्व की कमी जैसा नहीं होता।","छोटे, टेढ़े फल; नीचे से हरे रह सकते हैं और स्वाद कड़वा हो सकता है।","शाखाएं सूख सकती हैं और पेड़ धीरे-धीरे कमज़ोर हो जाता है।"],
        causes: ["रस चूसने वाले छोटे कीट (सिट्रस सायला) और कलम, पौध जैसे रोगी पौध-सामग्री से फैलने वाला जीवाणु।","एक बार पेड़ में संक्रमण होने पर वह आमतौर पर ठीक नहीं होता।"],
        steps: ["यह गंभीर रोग है। जल्द अपने कृषि/उद्यान विभाग के अधिकारी या KVK से संपर्क करें और यह फोटो दिखाएं।","इस पेड़ की कलम, टहनी या पौध दूसरी जगह न ले जाएं।","पेड़ पर निशान लगाएं और आसपास के पेड़ों में ऐसे लक्षण देखें।","पेड़ और कीट के प्रबंधन के बारे में विशेषज्ञ की सलाह मानें।"],
        prevention: ["केवल प्रमाणित, रोगमुक्त पौध लगाएं।","कीट पर नज़र रखें और विशेषज्ञ की सलाह से उसका प्रबंधन करें।","बाग की साफ़-सफ़ाई रखें और संदिग्ध मामलों की जल्दी सूचना दें।"]
      }
    },

    viral: {
      en: {
        symptoms: ["Yellowing, curling or crinkling of leaves, or a light and dark green mosaic pattern.","Stunted growth, smaller leaves and fewer or poorer fruits.","Signs differ between viruses and can look like other problems."],
        causes: ["Viruses. Some are carried by insects such as whiteflies; others spread through infected seed, hands, tools or plant sap.","Infected plants cannot be cured."],
        steps: ["Keep infected plants away from healthy ones and avoid handling healthy plants after touching affected ones.","Wash hands and tools after working near affected plants.","Show clear photos to your local agriculture officer or KVK. Ask whether affected plants should be removed and how to manage insects in your area.","Check nearby plants for similar signs."],
        prevention: ["Use healthy seed and virus-free seedlings, and varieties recommended locally for your area.","Keep weeds under control, as they can hide viruses and insects.","Use insect-proof nets in nurseries where possible and watch for insects."]
      },
      mr: {
        symptoms: ["पाने पिवळी पडणे, वळणे किंवा सुरकुतणे, किंवा फिकट व गडद हिरव्या रंगाचा चट्टेदार (मोझॅक) नमुना.","वाढ खुंटणे, लहान पाने आणि कमी किंवा निकृष्ट फळे.","लक्षणे विषाणूनुसार वेगळी असतात आणि इतर समस्यांसारखी दिसू शकतात."],
        causes: ["विषाणू. काही विषाणू पांढरी माशी यांसारख्या किडींमार्फत पसरतात; इतर रोगट बियाणे, हात, अवजारे किंवा झाडाच्या रसातून पसरतात.","बाधित झाडे बरी होत नाहीत."],
        steps: ["बाधित झाडे निरोगी झाडांपासून दूर ठेवा आणि बाधित झाडांना हात लावल्यानंतर निरोगी झाडे हाताळू नका.","बाधित झाडांजवळ काम केल्यानंतर हात आणि अवजारे धुवा.","स्पष्ट फोटो कृषी अधिकारी किंवा KVK यांना दाखवा. बाधित झाडे काढावीत का आणि तुमच्या भागात किडींचे व्यवस्थापन कसे करावे ते विचारा.","जवळच्या झाडांवर अशी लक्षणे आहेत का ते तपासा."],
        prevention: ["निरोगी बियाणे, विषाणूमुक्त रोपे आणि तुमच्या भागासाठी स्थानिक पातळीवर शिफारस केलेले वाण वापरा.","तण नियंत्रणात ठेवा, कारण त्यात विषाणू आणि किडी लपू शकतात.","शक्य असल्यास रोपवाटिकेत कीटकरोधक जाळी वापरा आणि किडींवर लक्ष ठेवा."]
      },
      hi: {
        symptoms: ["पत्तियों का पीला पड़ना, मुड़ना या सिकुड़ना, या हल्के और गहरे हरे रंग का चितकबरा (मोज़ेक) पैटर्न।","बढ़वार रुकना, छोटी पत्तियां और कम या खराब फल।","लक्षण विषाणु के अनुसार अलग होते हैं और अन्य समस्याओं जैसे दिख सकते हैं।"],
        causes: ["विषाणु (वायरस)। कुछ सफ़ेद मक्खी जैसे कीटों से फैलते हैं; अन्य रोगी बीज, हाथ, औज़ार या पौधे के रस से फैलते हैं।","प्रभावित पौधे ठीक नहीं होते।"],
        steps: ["प्रभावित पौधों को स्वस्थ पौधों से दूर रखें और प्रभावित पौधे छूने के बाद स्वस्थ पौधे न छुएं।","प्रभावित पौधों के पास काम करने के बाद हाथ और औज़ार धो लें।","साफ़ फोटो कृषि अधिकारी या KVK को दिखाएं। पूछें कि प्रभावित पौधे हटाने चाहिए या नहीं और आपके क्षेत्र में कीटों का प्रबंधन कैसे करें।","आसपास के पौधों में ऐसे लक्षण जांचें।"],
        prevention: ["स्वस्थ बीज, विषाणु-मुक्त पौध और अपने क्षेत्र के लिए स्थानीय रूप से अनुशंसित किस्में लें।","खरपतवार नियंत्रण में रखें, क्योंकि उनमें विषाणु और कीट छिप सकते हैं।","संभव हो तो नर्सरी में कीट-रोधी जाली लगाएं और कीटों पर नज़र रखें।"]
      }
    },

    mite: {
      en: {
        symptoms: ["Fine yellow or whitish speckles on leaves, often starting on the upper side.","Fine webbing and tiny moving dots on the underside of leaves.","Leaves may turn bronze or dry up in heavy infestations."],
        causes: ["Very small mites that suck sap from leaves.","Hot, dry and dusty conditions and water stress favour mite build-up."],
        steps: ["Look at the underside of leaves with a magnifying glass, if available, to confirm tiny mites or webbing.","Remove and destroy heavily infested leaves away from the field.","Avoid water stress and dust on plants as far as possible.","Ask your local agriculture officer or KVK about mite management that is approved for your crop and region. Do not use any spray without expert advice."],
        prevention: ["Check the underside of leaves regularly, especially in hot, dry weather.","Keep plants well watered and avoid dust near the crop.","Avoid unnecessary sprays that may harm helpful insects that eat mites."]
      },
      mr: {
        symptoms: ["पानांवर बारीक पिवळसर किंवा पांढरट ठिपके, अनेकदा वरच्या बाजूने सुरू होतात.","पानांच्या खालच्या बाजूला बारीक जाळे आणि हलणारे सूक्ष्म ठिपके.","जास्त प्रादुर्भावात पाने तांबूस होऊ शकतात किंवा सुकू शकतात."],
        causes: ["पानांतील रस शोषणारे अतिशय लहान कोळी (माइट्स).","उष्ण, कोरडे, धुळीचे वातावरण आणि पाण्याचा ताण यामुळे कोळींची संख्या वाढते."],
        steps: ["शक्य असल्यास भिंगाने पानांची खालची बाजू पाहून सूक्ष्म कोळी किंवा जाळे आहे का ते खात्री करा.","जास्त प्रादुर्भाव झालेली पाने काढून शेतापासून दूर नष्ट करा.","शक्य तितका पाण्याचा ताण आणि झाडांवरील धूळ टाळा.","तुमच्या पिकासाठी आणि भागासाठी मान्य असलेल्या कोळी-व्यवस्थापनाबद्दल कृषी अधिकारी किंवा KVK यांना विचारा. तज्ज्ञांच्या सल्ल्याशिवाय कोणतीही फवारणी करू नका."],
        prevention: ["विशेषतः उष्ण, कोरड्या हवामानात पानांची खालची बाजू नियमित तपासा.","झाडांना पुरेसे पाणी द्या आणि पिकाजवळ धूळ टाळा.","कोळी खाणाऱ्या मित्र-किडींना हानी पोहोचवणाऱ्या अनावश्यक फवारण्या टाळा."]
      },
      hi: {
        symptoms: ["पत्तियों पर बारीक पीले या सफ़ेदी लिए धब्बे, अक्सर ऊपरी सतह से शुरू होते हैं।","पत्तियों की निचली सतह पर बारीक जाला और हिलते हुए सूक्ष्म कण।","ज़्यादा प्रकोप में पत्तियां कांसे के रंग की हो सकती हैं या सूख सकती हैं।"],
        causes: ["बहुत छोटे माइट (मकड़ी जैसे कीट) जो पत्तियों का रस चूसते हैं।","गर्म, सूखा और धूल भरा मौसम तथा पानी की कमी से इनकी संख्या बढ़ती है।"],
        steps: ["संभव हो तो आवर्धक कांच (मैग्निफाइंग ग्लास) से पत्तियों की निचली सतह देखकर सूक्ष्म माइट या जाले की पुष्टि करें।","ज़्यादा प्रकोप वाली पत्तियां तोड़कर खेत से दूर नष्ट करें।","जहां तक हो सके पानी की कमी और पौधों पर धूल से बचें।","अपने कृषि अधिकारी या KVK से पूछें कि आपकी फसल और क्षेत्र के लिए माइट प्रबंधन का कौन सा तरीका मान्य है। विशेषज्ञ की सलाह के बिना कोई छिड़काव न करें।"],
        prevention: ["खासकर गर्म, सूखे मौसम में पत्तियों की निचली सतह नियमित जांचें।","पौधों को पर्याप्त पानी दें और फसल के पास धूल से बचें।","माइट खाने वाले मित्र कीटों को नुकसान पहुंचाने वाले अनावश्यक छिड़काव से बचें।"]
      }
    },

    healthy: {
      en: {
        symptoms: ["The model did not find signs of one of the diseases it knows in this photo."],
        causes: ["No disease cause was identified from this photo."],
        steps: ["Keep checking your plants regularly and compare with this photo later.","If you still see problems such as yellowing, spots, pests or poor growth, show the plant to an agriculture expert. The model knows only a limited list of diseases and cannot detect pests or nutrient problems."],
        prevention: ["Use healthy seed and rotate crops.","Water at the base of plants and keep enough space between them.","Remove weeds and old crop residue.","Check leaves regularly so that problems are noticed early."]
      },
      mr: {
        symptoms: ["मॉडेलला या फोटोत त्याला माहीत असलेल्या कोणत्याही रोगाची लक्षणे आढळली नाहीत."],
        causes: ["या फोटोवरून रोगाचे कोणतेही कारण ओळखले गेले नाही."],
        steps: ["झाडांची नियमित तपासणी करत राहा आणि नंतर या फोटोशी तुलना करा.","तरीही पिवळेपणा, डाग, कीड किंवा कमजोर वाढ अशा समस्या दिसल्यास झाड कृषी तज्ज्ञांना दाखवा. मॉडेलला मर्यादित रोगांची यादीच माहीत आहे आणि ते कीड किंवा अन्नद्रव्य कमतरता ओळखू शकत नाही."],
        prevention: ["निरोगी बियाणे वापरा आणि पिकांची फेरपालट करा.","झाडाच्या बुंध्याजवळ पाणी द्या आणि झाडांमध्ये पुरेशी जागा ठेवा.","तण आणि जुना पीक-अवशेष काढून टाका.","पाने नियमित तपासा, म्हणजे समस्या लवकर लक्षात येतील."]
      },
      hi: {
        symptoms: ["मॉडल को इस फोटो में अपने ज्ञात किसी भी रोग के लक्षण नहीं मिले।"],
        causes: ["इस फोटो से रोग का कोई कारण पहचाना नहीं गया।"],
        steps: ["पौधों की नियमित जांच करते रहें और बाद में इस फोटो से तुलना करें।","फिर भी पीलापन, धब्बे, कीट या कमज़ोर बढ़वार जैसी समस्या दिखे तो पौधा कृषि विशेषज्ञ को दिखाएं। मॉडल केवल सीमित रोगों की सूची जानता है और कीट या पोषक तत्वों की कमी नहीं पहचान सकता।"],
        prevention: ["स्वस्थ बीज लें और फसल चक्र अपनाएं।","पौधे की जड़ के पास पानी दें और पौधों के बीच पर्याप्त जगह रखें।","खरपतवार और पुराने फसल-अवशेष हटा दें।","पत्तियां नियमित जांचें ताकि समस्या जल्दी पकड़ में आए।"]
      }
    }
  };
  // Fallback if a class label is not in the table (should not happen for the intended model).
  GUIDE.unknown = GUIDE.fungal; // never used for display: app.js treats unknown classes as "uncertain"

  const api = { CROPS, ENTRIES, GUIDE, lookup, norm };
  root.Knowledge = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
