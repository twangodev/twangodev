---
title: "UW Course Map"
summary: "Explore the courses offered by UW-Madison in a visual and interactive way."
date: "Mar 18 2025"
draft: false
tags:
  - Svelte
  - SvelteKit
  - Typescript
  - Tailwind
  - Python
  - Docker
demoUrl: https://uwcourses.com/
repoUrl: https://github.com/twangodev/uw-coursemap
---

![UW Course Map Card](/public/assets/uw-coursemap/card.png)

UW Course Map began as a hackathon project in 2024, and has turned into a widely used tool for students at the University of Wisconsin-Madison to explore and plan their academic journey. The platform aggregates course data, professor ratings, grade distributions, and prerequisite relationships into an intuitive interface that helps students discover courses and make informed decisions.

Here's some quick stats about UW Course Map:

- 600+ monthly active users, with 3M+ requests served per month
- Handles 10K+ courses across 190+ departments
- Fully open sourced, with fully public APIs for students and developers
- Minimal project upkeep required, the only real costs to me end up around max $20/year.

<small>If your interested reading the technical details behind UW Course Map, you can read the documentation [here](https://docs.uwcourses.com/). This serves more as a journey of how this project progressed, from idea to production.</small>

## The Idea

UW-Madison, like many colleges, offers a wide variety of courses across departments. But finding the right classes can be a challenge, especially when it comes to navigating complex relationships between courses.

Some solutions to this problem laying courses out on a graph, with directed edges representing dependencies. But oftentimes, you need to create this graph by hand, which isn't feasible at scale.

<small style="text-align: center;">

![HKN-Screenshot](/public/assets/uw-coursemap/hkn.png)

It served as a great initial inspiration for UW Course Map, especially with the interactive elements.

Source: [HKN Course Guide, UC Berkeley](https://hkn.eecs.berkeley.edu/courseguides).

</small>

## Prototyping

Before we scale this to all departments, let's make sure I can at least replicate the experience of the HKN course guide.

Basic requirements for the prototype were:

- **DAG-like graph**: Each node represents a course, and edges represent prerequisites.
- **Interactive**: Users should be able to click on nodes to see more information, and hover over edges to see prerequisite chains.

And here's what I came up with:

<small style="text-align: center;">

![Prototype](/public/assets/uw-coursemap/prototype.png)

The CS department of UW-Madison, as of August 2024. I don't have a public preview as it's on my private server.

</small>

The prototype immediately validated my initial idea, however it scaled terribly. My 3 main concerns were:

1. All data was manually entered, which meant I had to hand write the prerequisite chains for each course. Nodes, edges, labels, colors - fully manual.
2. How exactly do we determine a recommended course?
3. CS courses are grouped into individual subgroups such as core, elective, applications, etc. How do we handle this across departments?

Obviously, these would need to be addressed before we could scale to all departments.

## Data Acquisition

At the end of the day, the project is more of a data organization problem than a technical one. We need to sort data from multiple sources into a cohesive format, which sounds easy, but it's a pain in the ass.

I talk more about this within the project documentation, but the main takeaways are:

- **Data sources**: We need to integrate data from multiple sources, such as the course catalog, and be capable of adding professor ratings, and grade distributions later down the line.
- **Data formats**: Different sources use different formats, so we need to normalize them into a common format.
- **Data access**: We need to make data available to the frontend in a performant way.

This leads us to the next section:

## Architecture

My main constraint is cost. I don't want to spend a significant amount to keep the project running, so I need to make sure I can scale it to meet demand. So basically, I'm limiting myself to free tier services.

*The data I anticipate doesn't really change day to day, we can imagine a system that updates once a week or so.*

To execute upon this point, we can write some script that collects data, then outputs it statically. To ensure data freshness, we can keep the script on some cron job. Static files are easy to serve, and scale well.

There's no going around requiring a server though. Stuff like search, prerequisite parsing, and course recommendations all need to be handled by a server, so where does this happen?

- GitHub CI/CD: Free CI/CD services like GitHub Actions are great for this. All data related tasks can be run here, and then output as artifacts.
- Cloudflare
    - Cloudflare Pages can be used to serve static files, but it limits you to hosted 20K files, up to 25MB per file.
    - Instead, we can use GitHub Pages to host the static files, as there isn't really a limit to file count. File size isn't a concern, as 100MB is more than enough.
    - Cloudflare can then act as a CDN, caching files for faster load times across the world.
- Frontend: It acts as a layer between the user and the data, so it can be scaled independently.
    - If it's static, we can host it on GitHub Pages as well. But this depends greatly on when the data is updated - the tie between the data and the frontend is a bit of a mess.
    - If it's dynamic, we can host it on a serverless platform like Vercel, or just self-host it on a server. We'll look up the data from the static files in real-time. It really just acts as a translation layer between data to the user.
- Backend: We'll still need a backend to handle anything dynamic, such as search queries, etc.
    - This can be a simple Flask app, or a more complex microservice architecture.
    - Containerize, then scale it with Kubernetes if needed.

With that, we have a solid foundation to build upon.

## The Hackathon

During the hackathon, our main goal was to build a working prototype that scaled to the whole university in terms of data. Every department needed to be represented, and we needed to be able to handle a large number of courses.

Our script collected data from the course catalog, then we used OpenAI's `text-embedding-small` model to identify prerequisite courses. 

We then had a static file server that served the data to a frontend. 

By the end of the hackathon, we had a working prototype, but it was still far from production-ready.

Here's some fun stuff from the hackathon:

<small style="text-align: center;">

![All Hackathon](/public/assets/uw-coursemap/all-hackathon.png)

All the courses in the UW-Madison course catalog, visualized as a graph.

![Zoom Hackathon](/public/assets/uw-coursemap/zoom-hackathon.png)

Neat right?

![Cursed Hackathon](/public/assets/uw-coursemap/cursed-hackathon.png)

what the fuck.

</small>

We ended up winning as finalists in the hackathon, winning $100. From here, development of the project slowed.

## gener8tor

After the hackathon, I decided to take a step back and re-imagine the project. Sure, the prototype and hackathon were good enough, but I wanted to build something that would scale to the entire university, and maybe solved problems that people had, aside from looking at some graphs.

Personally, I noticed that looking up courses, then instructors, then debating internal course prerequisites was a tedious process. I wanted to make it easier for students to find courses, and make it easier for us as students to make informed decisions on our academic journey.

Okay, let's do that. Let's do what we said in [architecture](#architecture) regarding additional data integrations, and clean it up to be more than just a graph viewer.

I joined a team of 3 other students which I met through [gener8tor](https://www.gener8tor.com/) to build UW Course Map, which is the version your more familiar with today. This was like 2-3 months after the hackathon, and we were able to build a fully functional product by April.

We launched the product to just people we knew, such as clubs, friends, etc. It was a soft launch, but we were able to get some initial traction, and good results.

## Today

After some cleanup, we [launched it publicly](https://www.reddit.com/r/UWMadison/comments/1l2yutu/uw_madison_course_map/) on June 3, 2025. It's been a great experience so far, and I'm really happy with the results.

I'll try to keep the project running, but honestly I'm not sure if I have the time to actively maintain it or add features within a proper release cycle. But hopefully it can continue to grow and help students at UW-Madison, whether that be using it as a reference, contributing to the project, or building their own applications on top of our APIs.

Thanks for reading, and happy planning!
