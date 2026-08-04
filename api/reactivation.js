const https = require('https');


function postJSON(options, body) {

  return new Promise((resolve, reject) => {

    const req = https.request(options, (res) => {

      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {

        if (!data || data.trim() === '') {
          return resolve({});
        }

        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(
            new Error('JSON parse failed: ' + data)
          );
        }

      });

    });


    req.on('error', reject);


    if (body) {
      req.write(JSON.stringify(body));
    }


    req.end();

  });

}



async function sendEmail(to, subject, html) {

  return postJSON({

    hostname: 'api.resend.com',
    path: '/emails',
    method: 'POST',

    headers: {
      'Content-Type': 'application/json',
      'Authorization':
      `Bearer ${process.env.RESEND_API_KEY}`
    }

  }, {

    from:
    'Angel Scott <angel@ascottdigitalbiz.com>',

    to: [to],

    subject,

    html

  });

}



function generateReactivationContent(lead, stage) {


  let analysis = {};

  try {

    analysis = lead.full_analysis
      ? JSON.parse(lead.full_analysis)
      : {};

  } catch(e) {

    console.log(
      "Full analysis parse failed"
    );

  }



  const goal =
    lead.goal ||
    "your business goals";


  const problem =
    lead.problem ||
    "the challenges you mentioned";



  const diagnosis =
    analysis.diagnosis ||
    "Based on your previous assessment, there are opportunities to improve your current approach.";



  const solution =
    analysis.solution_name ||
    "a better marketing system";



  const chatLink =
    `https://ai-funnel-engine.vercel.app/chat?id=${lead.id}`;



  const quizLink =
    `https://ai-funnel-engine.vercel.app/`;



  const templates = {



0: {

subject:
"Your Marketing Assessment Results Are Still Waiting For You",


html:`

<div style="font-family:Arial;max-width:700px;margin:auto;">


<h2>Hi ${lead.name},</h2>


<p>
A while ago, you completed our Marketing Assessment, and I wanted to reconnect with you.
</p>


<p>
You shared that your goal was:
</p>


<p>
<strong>${goal}</strong>
</p>


<p>
And one of the biggest challenges you mentioned was:
</p>


<p>
<strong>${problem}</strong>
</p>



<p>
After reviewing your answers again, this was the main thing that stood out:
</p>


<p>
${diagnosis}
</p>



<p>
Your recommended direction was:
</p>


<h3>
${solution}
</h3>



<p>
Your personalized assessment is still available if you want to revisit your strategy.
</p>


<a href="${chatLink}">
Continue My Assessment
</a>


<br><br>


<p>
Want to retake the Marketing Assessment?
</p>


<a href="${quizLink}">
Take Marketing Quiz Again
</a>


</div>

`

},



1: {

subject:
"The Biggest Opportunity From Your Previous Assessment",


html:`

<h2>Hi ${lead.name},</h2>


<p>
I was reviewing some previous Marketing Assessment responses and noticed something important.
</p>


<p>
You were looking for:
</p>


<p>
<strong>${goal}</strong>
</p>


<p>
But the obstacle you identified was:
</p>


<p>
<strong>${problem}</strong>
</p>


<p>
Many businesses don't fail because they lack effort.
They struggle because their process is not predictable.
</p>


<p>
Your assessment pointed toward:
</p>


<h3>${solution}</h3>


<a href="${chatLink}">
Continue My Assessment
</a>


`

},



2: {

subject:
"Has Anything Changed Since Your Assessment?",


html:`

<h2>Hi ${lead.name},</h2>


<p>
I wanted to check back with you.
</p>


<p>
When you completed your Marketing Assessment, you mentioned:
</p>


<p>
<strong>${problem}</strong>
</p>


<p>
I'm curious — has this challenge improved, stayed the same, or become more difficult?
</p>


<p>
Your original recommendation was:
</p>


<h3>${solution}</h3>


<a href="${chatLink}">
Review My Assessment
</a>


`

},



3: {

subject:
"Should We Revisit Your Marketing Strategy?",


html:`

<h2>Hi ${lead.name},</h2>


<p>
Before I close the loop, I wanted to give you one last opportunity to revisit your previous assessment.
</p>


<p>
Your goal was:
</p>


<p>
<strong>${goal}</strong>
</p>


<p>
And the strategy recommended was:
</p>


<h3>${solution}</h3>


<p>
If this is still something you want to improve, your assessment is ready.
</p>


<a href="${chatLink}">
Continue My Assessment
</a>


`

}


};


return templates[stage] || templates[0];


}
module.exports = async function handler(req, res) {

  try {


    const supabaseURL =
      new URL(process.env.SUPABASE_URL);



    // Get maximum 10 old leads ready for reactivation
    const oldLeads = await postJSON({

      hostname: supabaseURL.hostname,

      path:
      '/rest/v1/leads' +

      '?created_at=lt.2026-08-01T00:00:00' +

      '&reactivation_active=eq.true' +

      '&reactivation_stage=lt.4' +

      '&reactivation_next_at=lte.' +
      encodeURIComponent(new Date().toISOString()) +

      '&limit=10',


      method:'GET',


      headers: {

        'apikey':
        process.env.SUPABASE_ANON_KEY,

        'Authorization':
        `Bearer ${process.env.SUPABASE_ANON_KEY}`

      }


    });



    console.log(
      'Reactivation leads found:',
      oldLeads.length
    );



    for (const lead of oldLeads) {



      const stage =
        lead.reactivation_stage || 0;



      const emailContent =
        generateReactivationContent(
          lead,
          stage
        );



      await sendEmail(

        lead.email,

        emailContent.subject,

        emailContent.html

      );




      /*
        Schedule next email timing

        Stage 0  -> after 3 days
        Stage 1  -> after 7 days
        Stage 2  -> after 14 days
        Stage 3  -> finish and move to nurture

      */


      if (stage >= 3) {



        // Move to normal 90-day nurture sequence

        const nextFollowup =
          new Date();


        nextFollowup.setDate(
          nextFollowup.getDate() + 5
        );



        await postJSON({

          hostname:
          supabaseURL.hostname,


          path:
          `/rest/v1/leads?id=eq.${lead.id}`,


          method:'PATCH',


          headers: {

            'Content-Type':
            'application/json',

            'apikey':
            process.env.SUPABASE_ANON_KEY,

            'Authorization':
            `Bearer ${process.env.SUPABASE_ANON_KEY}`,

            'Prefer':
            'return=representation'

          }


        }, {


          reactivation_active:false,


          followup_active:true,


          followup_stage:0,


          next_followup_at:
          nextFollowup.toISOString(),


          last_email_sent_at:
          new Date().toISOString()


        });



        console.log(
          'Moved to nurture:',
          lead.email
        );



      } else {



        const scheduleDays = {


          0:3,

          1:7,

          2:14


        };



        const nextDate =
          new Date();



        nextDate.setDate(

          nextDate.getDate()
          +
          (scheduleDays[stage] || 7)

        );




        await postJSON({

          hostname:
          supabaseURL.hostname,


          path:
          `/rest/v1/leads?id=eq.${lead.id}`,


          method:'PATCH',


          headers: {


            'Content-Type':
            'application/json',


            'apikey':
            process.env.SUPABASE_ANON_KEY,


            'Authorization':
            `Bearer ${process.env.SUPABASE_ANON_KEY}`,


            'Prefer':
            'return=representation'


          }


        }, {



          reactivation_stage:
          stage + 1,


          reactivation_next_at:
          nextDate.toISOString(),


          last_email_sent_at:
          new Date().toISOString()



        });



        console.log(
          'Reactivation email sent:',
          lead.email
        );

      }



    }



    return res.status(200).json({

      success:true,

      processed:oldLeads.length

    });



  } catch(err) {


    console.error(
      'Reactivation error:',
      err
    );


    return res.status(500).json({

      error:err.message

    });


  }


};
